import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashToken } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
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

	if (!env.GITHUB_CLIENT_ID) error(500, 'GitHub is not configured');

	const state = crypto.randomUUID();
	cookies.set('github_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60 * 10
	});

	// Where to return after connecting (e.g. back to the project that triggered it).
	const returnTo = url.searchParams.get('return');
	if (returnTo && /^\/(?![/\\])/.test(returnTo)) {
		cookies.set('github_return', returnTo, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 10
		});
	} else {
		cookies.delete('github_return', { path: '/' });
	}

	const params = new URLSearchParams({
		client_id: env.GITHUB_CLIENT_ID,
		redirect_uri: env.GITHUB_REDIRECT_URI || `${url.origin}/auth/github/callback`,
		// `public_repo` lets us create + push a public Pages repo in their account.
		scope: 'public_repo',
		state
	});

	redirect(302, `https://github.com/login/oauth/authorize?${params}`);
};
