import { redirect } from '@sveltejs/kit';

// The public marketing site (boba.hackclub.com) is the real landing page, so the
// platform root is just a door into the app: signed-in users go to their
// dashboard, everyone else is sent to log in.
export function load({ locals }) {
	if (locals.user) redirect(302, '/home');
	redirect(302, '/login');
}
