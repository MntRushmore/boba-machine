import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/?needs_auth=1');
	// Hackatime is optional in Boba Drops — no gate here; the setup step (address)
	// already ran before this final step.
};

export const actions: Actions = {
	finish: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/?needs_auth=1');

		const data = await request.formData();
		const raw = data.get('destination') as string | null;
		const destination = raw && /^\/(?![/\\])/.test(raw) ? raw : '/home';

		await db
			.update(users)
			.set({ onboardedAt: new Date(), updatedAt: new Date() })
			.where(eq(users.hcaId, locals.user.sub));

		redirect(302, destination);
	}
};
