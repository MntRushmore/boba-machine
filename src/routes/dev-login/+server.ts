import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { users, sessions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { generateSessionToken, hashToken } from '$lib/server/session';

/**
 * Local-only login shortcut for previewing the app without the Hack Club Auth
 * round-trip. Hard-gated behind BOTH the dev build flag AND an explicit
 * DEV_LOGIN env toggle, so it can never be reached in production even if the
 * route is accidentally deployed.
 *
 *   DEV_LOGIN=1 bun run dev   →   visit /dev-login   →   logged in as a demo user
 *
 * Make that demo user an admin/reviewer by adding its hca_id to ADMIN_IDS /
 * REVIEWER_IDS: ident!dev-login-demo
 */
const DEMO_HCA_ID = 'ident!dev-login-demo';

function enabled(): boolean {
	const v = (env.DEV_LOGIN ?? '').trim().toLowerCase();
	return dev && (v === '1' || v === 'true' || v === 'yes');
}

export async function GET({ cookies }) {
	if (!enabled()) error(404, 'Not found');

	// Reuse the demo user if it exists, otherwise create a fully-onboarded,
	// verified one so it clears every gate (eligibility, onboarding, address).
	let [u] = await db.select().from(users).where(eq(users.hcaId, DEMO_HCA_ID)).limit(1);
	if (!u) {
		[u] = await db
			.insert(users)
			.values({
				hcaId: DEMO_HCA_ID,
				name: 'Demo Builder',
				nickname: 'demo',
				email: 'demo@boba.test',
				emailVerified: true,
				slackDisplayName: 'demo',
				verificationStatus: 'verified',
				yswsEligible: true,
				birthday: '2009-01-01',
				onboardedAt: new Date(),
				streetAddress: '15 Falls Rd',
				locality: 'Shelburne',
				region: 'VT',
				postalCode: '05482',
				country: 'United States'
			})
			.returning();
	}

	const rawToken = generateSessionToken();
	await db.insert(sessions).values({
		id: hashToken(rawToken),
		userId: u.id,
		expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
	});

	cookies.set('hca_session', rawToken, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 30 * 24 * 60 * 60
	});

	redirect(302, '/home');
}
