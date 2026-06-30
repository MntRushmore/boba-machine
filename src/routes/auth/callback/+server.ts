import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { encryptToken, generateSessionToken, hashToken, encryptionKey } from '$lib/server/session';
import { getLaunched } from '$lib/server/launch';
import { inviteToChannel } from '$lib/server/slack';
import { checkYswsStatus } from '$lib/server/verification';
import type { RequestHandler } from './$types';

// Slack channel new builders are auto-invited to on first login. Overridable
// via env so it can point at the Boba Drops channel without a code change.
const WELCOME_CHANNEL_ID = env.SLACK_WELCOME_CHANNEL_ID || 'C0AM132QQUR';

const adminSet = new Set((env.ADMIN_IDS || '').split(' ').map((id) => id.trim()).filter(Boolean));
const reviewerSet = new Set((env.REVIEWER_IDS || '').split(' ').map((id) => id.trim()).filter(Boolean));

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// The claims Boba Drops reads from Hack Club Auth. `birthdate`/`address` are
// only present if HQ grants those (restricted) scopes — treated as optional.
// Normalized shape the rest of the callback consumes (flat, OIDC-ish).
interface HcaUserInfo {
	sub?: string;
	name?: string;
	nickname?: string;
	email?: string;
	email_verified?: boolean;
	slack_id?: string;
	verification_status?: string;
	ysws_eligible?: boolean;
	birthdate?: string;
	address?: {
		street_address?: string;
		locality?: string;
		region?: string;
		postal_code?: string;
		country?: string;
	};
}

// The ACTUAL Hack Club Auth `/api/v1/me` response nests everything under
// `identity` with its own field names (id, primary_email, first_name, …).
// Normalize it to HcaUserInfo so downstream code stays simple.
interface HcaIdentity {
	id?: string;
	first_name?: string;
	last_name?: string;
	primary_email?: string;
	email?: string;
	slack_id?: string;
	verification_status?: string;
	ysws_eligible?: boolean;
	birthday?: string;
	birthdate?: string;
	addresses?: Array<{
		line_1?: string;
		line_2?: string;
		city?: string;
		state?: string;
		postal_code?: string;
		zip_code?: string;
		country?: string;
	}>;
}

function normalizeIdentity(raw: unknown): HcaUserInfo | null {
	if (!raw || typeof raw !== 'object') return null;
	const obj = raw as Record<string, unknown>;
	// Real shape: { identity: {...}, scopes: [...] }. Also tolerate a flat/OIDC
	// response or a { data: {...} } envelope.
	const id = (obj.identity ?? obj.data ?? obj) as HcaIdentity & Record<string, unknown>;
	const sub = id.id ?? (id as Record<string, unknown>).sub;
	if (!sub || typeof sub !== 'string') return null;
	const name = [id.first_name, id.last_name].filter(Boolean).join(' ').trim() || (id as Record<string, unknown>).name as string | undefined;
	const addr = Array.isArray(id.addresses) ? id.addresses[0] : undefined;
	return {
		sub,
		name: name || undefined,
		email: id.primary_email ?? id.email,
		email_verified: !!(id.primary_email ?? id.email),
		slack_id: id.slack_id,
		verification_status: id.verification_status,
		ysws_eligible: id.ysws_eligible,
		birthdate: id.birthday ?? id.birthdate,
		address: addr
			? {
					street_address: addr.line_1,
					locality: addr.city,
					region: addr.state,
					postal_code: addr.postal_code ?? addr.zip_code,
					country: addr.country
				}
			: undefined
	};
}

/**
 * Fetch the signed-in user's profile from Hack Club Auth. The OAuth guide
 * documents `GET /api/v1/me`; some deployments also expose the OIDC-standard
 * `/oauth/userinfo`. Try the documented one first, fall back to the other, and
 * unwrap a `{ data: {...} }` envelope if present. Returns null on total failure.
 */
async function fetchUserInfo(accessToken: string): Promise<HcaUserInfo | null> {
	const endpoints = [
		'https://auth.hackclub.com/api/v1/me',
		'https://auth.hackclub.com/oauth/userinfo'
	];
	for (const ep of endpoints) {
		try {
			const res = await fetch(ep, { headers: { Authorization: `Bearer ${accessToken}` } });
			if (!res.ok) {
				console.error('[hca-callback] userinfo', ep, '→', res.status, (await res.text()).slice(0, 200));
				continue;
			}
			const json = await res.json();
			const normalized = normalizeIdentity(json);
			console.log('[hca-callback] userinfo OK from', ep, '→ sub:', normalized?.sub);
			if (normalized) return normalized;
		} catch (e) {
			console.error('[hca-callback] userinfo fetch threw for', ep, (e as Error).message);
		}
	}
	return null;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const savedState = cookies.get('hca_state');

	console.log('[hca-callback] hit:', {
		hasCode: !!code,
		hasState: !!state,
		hasSavedState: !!savedState,
		stateMatches: !!savedState && state === savedState,
		errParam: url.searchParams.get('error'),
		errDesc: url.searchParams.get('error_description')
	});

	// Hack Club Auth may redirect back with its own error (e.g. access_denied).
	if (url.searchParams.get('error')) {
		console.error('[hca-callback] provider returned error:', url.searchParams.get('error'), url.searchParams.get('error_description'));
		redirect(302, '/?error=auth_failed');
	}
	if (!code || !state) {
		console.error('[hca-callback] missing code/state');
		redirect(302, '/?error=auth_failed');
	}
	if (!savedState || state !== savedState) {
		console.error('[hca-callback] state mismatch — savedState present:', !!savedState);
		redirect(302, '/?error=session_expired');
	}

	cookies.delete('hca_state', { path: '/' });

	const tokenRes = await fetch('https://auth.hackclub.com/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: env.HCA_CLIENT_ID,
			client_secret: env.HCA_CLIENT_SECRET,
			redirect_uri: env.HCA_REDIRECT_URI,
			code
		})
	});

	if (!tokenRes.ok) {
		const body = await tokenRes.text();
		console.error('[hca-callback] token exchange failed', tokenRes.status, body.slice(0, 300));
		error(502, 'token exchange failed');
	}
	const tokenData = await tokenRes.json();
	const access_token: string | undefined = tokenData.access_token;
	if (!access_token) {
		console.error('[hca-callback] no access_token in token response:', JSON.stringify(tokenData).slice(0, 200));
		error(502, 'no access token returned');
	}

	// The Hack Club Auth OAuth guide documents the user-info endpoint as
	// `/api/v1/me`. A standard OIDC `/oauth/userinfo` may also exist but isn't
	// documented, so try the documented one first and fall back to it.
	const user = await fetchUserInfo(access_token);
	if (!user) {
		console.error('[hca-callback] fetchUserInfo returned null');
		error(502, 'failed to fetch user info');
	}
	console.log('[hca-callback] userinfo keys:', Object.keys(user), 'sub:', user.sub);

	if (!user.sub) {
		console.error('[hca-callback] userinfo missing sub:', JSON.stringify(user).slice(0, 200));
		redirect(302, '/?error=auth_failed');
	}

	// Boba Drops is "build a site → get boba": anyone with a Hack Club account can
	// log in and build. Eligibility (verified 13–18, US for individual cash) is
	// enforced when they SUBMIT for review + at payout — not at login. We still
	// fetch + store the latest YSWS check result here so the submit gate + reviewer
	// panel have it without a second round-trip.
	const checkResult = await checkYswsStatus(user.sub);

	let avatar_url: string | undefined;
	let slack_display_name: string | undefined;
	if (user.slack_id && env.SLACK_BOT_TOKEN) {
		const slackRes = await fetch(`https://slack.com/api/users.info?user=${user.slack_id}`, {
			headers: { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}` }
		});
		const slackData = await slackRes.json();
		avatar_url = slackData.user?.profile?.image_192 ?? slackData.user?.profile?.image_72 ?? undefined;
		slack_display_name = slackData.user?.profile?.display_name || slackData.user?.name || undefined;

		inviteToChannel(user.slack_id as string, WELCOME_CHANNEL_ID).catch(() => {});
	}

	const encKey = encryptionKey();
	const { ct, iv, tag } = encryptToken(access_token, encKey);

	const userRow = {
		hcaId: user.sub,
		name: user.name ?? null,
		nickname: user.nickname ?? null,
		email: user.email ?? null,
		emailVerified: user.email_verified ?? null,
		slackId: user.slack_id ?? null,
		slackAvatarUrl: avatar_url ?? null,
		slackDisplayName: slack_display_name ?? null,
		verificationStatus: user.verification_status ?? null,
		yswsEligible: checkResult === 'verified_eligible',
		yswsCheckResult: checkResult,
		birthday: user.birthdate ?? null,
		accessTokenCt: ct,
		accessTokenIv: iv,
		accessTokenTag: tag,
		updatedAt: new Date()
	};

	// Address comes from the HCA `address` scope. We only autofill blank fields —
	// never overwrite an address the user has already entered themselves.
	// HCA packs both street lines into `street_address`, newline-separated, so
	// split the first line into line 1 and fold any remainder into line 2.
	const addr = user.address ?? {};
	const [streetLine1, ...streetRest] = (addr.street_address ?? '').split(/\r?\n/);
	const addressInsert = {
		streetAddress: streetLine1?.trim() || null,
		addressLine2: streetRest.join(' ').trim() || null,
		locality: addr.locality ?? null,
		region: addr.region ?? null,
		postalCode: addr.postal_code ?? null,
		country: addr.country ?? null
	};

	const [dbUser] = await db
		.insert(users)
		.values({ ...userRow, ...addressInsert })
		.onConflictDoUpdate({
			target: users.hcaId,
			set: {
				...userRow,
				streetAddress: sql`coalesce(nullif(${users.streetAddress}, ''), ${addressInsert.streetAddress})`,
				addressLine2: sql`coalesce(nullif(${users.addressLine2}, ''), ${addressInsert.addressLine2})`,
				locality: sql`coalesce(nullif(${users.locality}, ''), ${addressInsert.locality})`,
				region: sql`coalesce(nullif(${users.region}, ''), ${addressInsert.region})`,
				postalCode: sql`coalesce(nullif(${users.postalCode}, ''), ${addressInsert.postalCode})`,
				country: sql`coalesce(nullif(${users.country}, ''), ${addressInsert.country})`
			}
		})
		.returning({ id: users.id, onboardedAt: users.onboardedAt });

	const rawToken = generateSessionToken();
	await db.insert(sessions).values({
		id: hashToken(rawToken),
		userId: dbUser.id,
		expiresAt: new Date(Date.now() + SESSION_TTL_MS)
	});

	const launched = await getLaunched();
	const isAdmin = adminSet.has(user.sub);
	const isReviewer = reviewerSet.has(user.sub);

	if (!launched && !isAdmin && !isReviewer) {
		// Site is locked — kill the session and send them back with a message
		await db.delete(sessions).where(eq(sessions.id, hashToken(rawToken)));
		redirect(302, '/?locked=1');
	}

	cookies.set('hca_session', rawToken, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: SESSION_TTL_MS / 1000
	});

	// First-time users go through onboarding; returning users land on the dashboard.
	redirect(302, dbUser.onboardedAt ? '/home' : '/onboarding');
};
