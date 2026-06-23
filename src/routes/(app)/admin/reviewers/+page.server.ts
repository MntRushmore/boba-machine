import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { reviewers, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function load({ locals }) {
	if (!locals.isAdmin) error(403, 'Forbidden');

	const rows = await db
		.select({
			id: reviewers.id,
			hcaId: reviewers.hcaId,
			createdAt: reviewers.createdAt,
			name: users.name,
			nickname: users.nickname,
			slackDisplayName: users.slackDisplayName,
			slackAvatarUrl: users.slackAvatarUrl
		})
		.from(reviewers)
		.leftJoin(users, eq(reviewers.hcaId, users.hcaId));

	return { reviewers: rows };
}

export const actions = {
	add: async ({ request, locals }) => {
		if (!locals.isAdmin) error(403, 'Forbidden');

		const data = await request.formData();
		const hcaId = (data.get('hca_id') as string | null)?.trim();

		if (!hcaId) return fail(400, { error: 'hca_id is required' });

		const existing = await db.select().from(reviewers).where(eq(reviewers.hcaId, hcaId)).limit(1);
		if (existing.length > 0) return fail(409, { error: `${hcaId} is already a reviewer` });

		await db.insert(reviewers).values({ hcaId });
	},

	remove: async ({ request, locals }) => {
		if (!locals.isAdmin) error(403, 'Forbidden');

		const data = await request.formData();
		const id = data.get('id') as string | null;

		if (!id) return fail(400, { error: 'id is required' });

		await db.delete(reviewers).where(eq(reviewers.id, id));
	}
};
