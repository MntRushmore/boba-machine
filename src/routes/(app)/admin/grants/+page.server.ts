import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { grants, projects, users } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function load({ locals }) {
	if (!locals.isAdmin) error(403, 'Forbidden');

	const rows = await db
		.select({
			id: grants.id,
			projectId: grants.projectId,
			projectName: projects.name,
			submissionType: grants.submissionType,
			payoutTarget: grants.payoutTarget,
			amountCents: grants.amountCents,
			currency: grants.currency,
			status: grants.status,
			recipientName: grants.recipientName,
			recipientEmail: grants.recipientEmail,
			recipientCountry: grants.recipientCountry,
			note: grants.note,
			sentAt: grants.sentAt,
			createdAt: grants.createdAt,
			userSlack: users.slackDisplayName,
			userNickname: users.nickname
		})
		.from(grants)
		.innerJoin(projects, eq(grants.projectId, projects.id))
		.leftJoin(users, eq(grants.userId, users.id))
		.orderBy(desc(grants.createdAt));

	// Pending first (the work queue), then everything else by recency.
	const ordered = [...rows].sort((a, b) => {
		if (a.status === 'pending' && b.status !== 'pending') return -1;
		if (b.status === 'pending' && a.status !== 'pending') return 1;
		return 0;
	});

	const [counts] = await db
		.select({
			total: sql<number>`count(*)::int`,
			pending: sql<number>`count(*) filter (where ${grants.status} = 'pending')::int`,
			sent: sql<number>`count(*) filter (where ${grants.status} = 'sent')::int`,
			pendingCents: sql<number>`coalesce(sum(${grants.amountCents}) filter (where ${grants.status} = 'pending'), 0)::int`
		})
		.from(grants);

	return { grants: ordered, counts };
}

export const actions = {
	markSent: async ({ request, locals }) => {
		if (!locals.isAdmin || !locals.user) return fail(403, { error: 'forbidden' });
		const form = await request.formData();
		const id = parseInt(form.get('grant_id') as string, 10);
		const note = (form.get('note') as string)?.trim() || null;
		if (!id || isNaN(id)) return fail(400, { error: 'invalid grant id' });

		const [admin] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.hcaId, locals.user.sub))
			.limit(1);

		await db
			.update(grants)
			.set({ status: 'sent', sentById: admin?.id ?? null, sentAt: new Date(), note })
			.where(eq(grants.id, id));

		return { success: true };
	},

	// Revert an accidental mark-sent back to pending.
	markPending: async ({ request, locals }) => {
		if (!locals.isAdmin) return fail(403, { error: 'forbidden' });
		const form = await request.formData();
		const id = parseInt(form.get('grant_id') as string, 10);
		if (!id || isNaN(id)) return fail(400, { error: 'invalid grant id' });

		await db
			.update(grants)
			.set({ status: 'pending', sentById: null, sentAt: null })
			.where(eq(grants.id, id));

		return { success: true };
	},

	void: async ({ request, locals }) => {
		if (!locals.isAdmin) return fail(403, { error: 'forbidden' });
		const form = await request.formData();
		const id = parseInt(form.get('grant_id') as string, 10);
		const note = (form.get('note') as string)?.trim() || null;
		if (!id || isNaN(id)) return fail(400, { error: 'invalid grant id' });

		await db.update(grants).set({ status: 'void', note }).where(eq(grants.id, id));

		return { success: true };
	}
};
