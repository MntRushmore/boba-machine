import { redirect } from '@sveltejs/kit';

// The public marketing site (boba.hackclub.com) is the real landing page, so the
// platform root is just a door into the app: signed-in users go to their
// dashboard, everyone else is sent to log in.
//
// IMPORTANT: when the URL carries a status flag (auth error / needs-auth /
// locked), DO NOT auto-redirect to /login. The auth callback sends failures to
// `/?error=…`, and /login bounces straight back into the OAuth flow — so an
// auto-redirect here creates an infinite login loop. Instead we fall through to
// the landing page, which shows the message + a manual "log in" button.
export function load({ locals, url }) {
	if (locals.user) redirect(302, '/home');

	const hasFlag =
		url.searchParams.has('error') ||
		url.searchParams.has('needs_auth') ||
		url.searchParams.has('locked');
	if (hasFlag) {
		return {
			authError: url.searchParams.get('error'),
			needsAuth: url.searchParams.has('needs_auth'),
			locked: url.searchParams.has('locked')
		};
	}

	redirect(302, '/login');
}
