import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { encryptToken, hashToken, encryptionKey } from '$lib/server/session';
import type { RequestHandler } from './$types';


export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const savedState = cookies.get('github_state');
	cookies.delete('github_state', { path: '/' });

	if (!code || !state || state !== savedState) redirect(302, '/account?github=error');

	const rawToken = cookies.get('hca_session');
	if (!rawToken) redirect(302, '/?needs_auth=1');
	const row = await db
		.select()
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, hashToken(rawToken)))
		.limit(1)
		.then((rows) => rows[0] ?? null);
	if (!row || row.sessions.expiresAt <= new Date()) redirect(302, '/?needs_auth=1');

	// Exchange the code for an access token.
	const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: env.GITHUB_CLIENT_ID,
			client_secret: env.GITHUB_CLIENT_SECRET,
			code,
			redirect_uri: env.GITHUB_REDIRECT_URI || `${url.origin}/auth/github/callback`
		})
	});
	if (!tokenRes.ok) error(502, 'GitHub token exchange failed');
	const tokenData = await tokenRes.json();
	const accessToken: string | undefined = tokenData.access_token;
	if (!accessToken) redirect(302, '/account?github=error');

	// Who is this?
	const meRes = await fetch('https://api.github.com/user', {
		headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' }
	});
	if (!meRes.ok) error(502, 'failed to read GitHub profile');
	const me = await meRes.json();
	const login: string | undefined = me.login;

	const encKey = encryptionKey();
	const { ct, iv, tag } = encryptToken(accessToken, encKey);

	await db
		.update(users)
		.set({
			githubLogin: login ?? null,
			githubTokenCt: ct,
			githubTokenIv: iv,
			githubTokenTag: tag,
			updatedAt: new Date()
		})
		.where(eq(users.id, row.users.id));

	const returnTo = cookies.get('github_return');
	cookies.delete('github_return', { path: '/' });
	redirect(302, returnTo && /^\/(?![/\\])/.test(returnTo) ? `${returnTo}?github=connected` : '/account?github=connected');
};
