import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	users,
	workshops,
	workshopApplications,
	workshopMembers
} from '$lib/server/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { generateJoinCode, getLedWorkshop } from '$lib/server/workshops';

export async function load({ locals }) {
	if (!locals.isAdmin) error(403, 'Forbidden');

	const applications = await db
		.select({
			id: workshopApplications.id,
			workshopName: workshopApplications.workshopName,
			organization: workshopApplications.organization,
			details: workshopApplications.details,
			status: workshopApplications.status,
			reviewerNote: workshopApplications.reviewerNote,
			createdAt: workshopApplications.createdAt,
			decidedAt: workshopApplications.decidedAt,
			applicantName: users.name,
			applicantNick: users.nickname,
			applicantSlack: users.slackDisplayName,
			applicantEmail: users.email
		})
		.from(workshopApplications)
		.innerJoin(users, eq(workshopApplications.applicantId, users.id))
		.orderBy(desc(workshopApplications.createdAt));

	// Active workshops with member counts.
	const ws = await db
		.select({
			id: workshops.id,
			name: workshops.name,
			organization: workshops.organization,
			joinCode: workshops.joinCode,
			status: workshops.status,
			leaderName: users.name,
			leaderNick: users.nickname,
			leaderSlack: users.slackDisplayName
		})
		.from(workshops)
		.innerJoin(users, eq(workshops.leaderId, users.id))
		.orderBy(desc(workshops.createdAt));

	const counts = await db
		.select({ workshopId: workshopMembers.workshopId, n: count() })
		.from(workshopMembers)
		.groupBy(workshopMembers.workshopId);
	const countMap = new Map(counts.map((c) => [c.workshopId, Number(c.n)]));

	return {
		applications: applications.map((a) => ({ ...a, pending: a.status === 'pending' })),
		workshops: ws.map((w) => ({ ...w, members: countMap.get(w.id) ?? 0 }))
	};
}

export const actions = {
	approve: async ({ request, locals }) => {
		if (!locals.isAdmin || !locals.user) return fail(403, { error: 'forbidden' });
		const [admin] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.hcaId, locals.user.sub))
			.limit(1);

		const form = await request.formData();
		const id = parseInt(form.get('application_id') as string, 10);
		const note = (form.get('note') as string)?.trim() || null;
		if (!id || isNaN(id)) return fail(400, { error: 'invalid application' });

		const [app] = await db
			.select()
			.from(workshopApplications)
			.where(eq(workshopApplications.id, id))
			.limit(1);
		if (!app) return fail(404, { error: 'application not found' });
		if (app.status !== 'pending') return fail(400, { error: 'already decided' });

		// Guard: the applicant can't already lead a workshop.
		if (await getLedWorkshop(app.applicantId))
			return fail(400, { error: 'applicant already leads a workshop' });

		const joinCode = await generateJoinCode();
		const [ws] = await db
			.insert(workshops)
			.values({
				leaderId: app.applicantId,
				name: app.workshopName,
				organization: app.organization,
				joinCode
			})
			.returning({ id: workshops.id });

		// If the new leader was a member of some workshop, detach them.
		await db.delete(workshopMembers).where(eq(workshopMembers.userId, app.applicantId));

		await db
			.update(workshopApplications)
			.set({
				status: 'approved',
				reviewerNote: note,
				workshopId: ws.id,
				decidedById: admin?.id ?? null,
				decidedAt: new Date()
			})
			.where(eq(workshopApplications.id, id));

		return { success: true };
	},

	reject: async ({ request, locals }) => {
		if (!locals.isAdmin || !locals.user) return fail(403, { error: 'forbidden' });
		const [admin] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.hcaId, locals.user.sub))
			.limit(1);

		const form = await request.formData();
		const id = parseInt(form.get('application_id') as string, 10);
		const note = (form.get('note') as string)?.trim() || null;
		if (!id || isNaN(id)) return fail(400, { error: 'invalid application' });

		await db
			.update(workshopApplications)
			.set({ status: 'rejected', reviewerNote: note, decidedById: admin?.id ?? null, decidedAt: new Date() })
			.where(eq(workshopApplications.id, id));

		return { success: true };
	}
};
