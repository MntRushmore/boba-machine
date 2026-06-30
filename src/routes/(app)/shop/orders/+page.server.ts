import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.user) redirect(302, '/login');
	// Builder-facing shop is retired in the Boba Drops grant model.
	redirect(307, '/home');
}
