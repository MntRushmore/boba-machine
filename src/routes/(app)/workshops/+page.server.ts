import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	users,
	workshops,
	workshopMembers,
	workshopApplications,
	projects,
	projectApprovals
} from '$lib/server/db/schema';
import { eq, and, desc, inArray, isNull } from 'drizzle-orm';
import { getLedWorkshop, getMembership } from '$lib/server/workshops';

async function getDbUser(hcaId: string) {
	const [row] = await db.select().from(users).where(eq(users.hcaId, hcaId)).limit(1);
	return row ?? null;
}

export async function load({ locals }) {
	if (!locals.user) redirect(302, '/login');
	const dbUser = await getDbUser(locals.user.sub);
	if (!dbUser) redirect(302, '/login');

	const led = await getLedWorkshop(dbUser.id);

	// LEADER VIEW — their workshop + roster with each member's latest status.
	if (led) {
		const members = await db
			.select({
				userId: workshopMembers.userId,
				joinedAt: workshopMembers.joinedAt,
				name: users.name,
				nickname: users.nickname,
				slackDisplayName: users.slackDisplayName,
				avatar: users.slackAvatarUrl
			})
			.from(workshopMembers)
			.innerJoin(users, eq(workshopMembers.userId, users.id))
			.where(eq(workshopMembers.workshopId, led.id))
			.orderBy(desc(workshopMembers.joinedAt));

		const memberIds = members.map((m) => m.userId);

		// Each member's projects + latest approval status, so the leader sees
		// who has shipped / who's pending / who can be endorsed.
		const projectRows = memberIds.length
			? await db
					.select({
						id: projects.id,
						userId: projects.userId,
						name: projects.name,
						demoUrl: projects.demoUrl
					})
					.from(projects)
					.where(inArray(projects.userId, memberIds))
			: [];

		const projIds = projectRows.map((p) => p.id);
		const approvals = projIds.length
			? await db
					.select({
						id: projectApprovals.id,
						projectId: projectApprovals.projectId,
						status: projectApprovals.status,
						endorsedAt: projectApprovals.endorsedAt,
						submittedAt: projectApprovals.submittedAt
					})
					.from(projectApprovals)
					.where(inArray(projectApprovals.projectId, projIds))
					.orderBy(desc(projectApprovals.submittedAt))
			: [];

		// latest approval per project
		const latestByProject = new Map<number, (typeof approvals)[number]>();
		for (const a of approvals) if (!latestByProject.has(a.projectId)) latestByProject.set(a.projectId, a);

		const roster = members.map((m) => {
			const memberProjects = projectRows
				.filter((p) => p.userId === m.userId)
				.map((p) => {
					const latest = latestByProject.get(p.id) ?? null;
					let status = latest?.status ?? 'draft';
					if (status === 'soft_approved') status = 'pending';
					return {
						id: p.id,
						name: p.name,
						demoUrl: p.demoUrl,
						status,
						approvalId: latest?.id ?? null,
						endorsed: !!latest?.endorsedAt,
						// endorsable iff there's a pending review not yet endorsed
						endorsable: latest?.status === 'pending' && !latest?.endorsedAt
					};
				});
			return {
				userId: m.userId,
				name: m.slackDisplayName || m.nickname || m.name || 'builder',
				avatar: m.avatar,
				joinedAt: m.joinedAt,
				projects: memberProjects,
				approvedCount: memberProjects.filter((p) => p.status === 'approved').length
			};
		});

		return {
			view: 'leader' as const,
			workshop: { id: led.id, name: led.name, organization: led.organization, joinCode: led.joinCode, status: led.status },
			roster
		};
	}

	// Already a member of a workshop?
	const membership = await getMembership(dbUser.id);
	if (membership) {
		return { view: 'member' as const, membership };
	}

	// Pending application?
	const [pendingApp] = await db
		.select()
		.from(workshopApplications)
		.where(and(eq(workshopApplications.applicantId, dbUser.id), eq(workshopApplications.status, 'pending')))
		.orderBy(desc(workshopApplications.createdAt))
		.limit(1);

	return {
		view: 'none' as const,
		pendingApplication: pendingApp
			? { workshopName: pendingApp.workshopName, createdAt: pendingApp.createdAt }
			: null
	};
}

export const actions = {
	// Apply to run a workshop. Lands in the admin queue.
	apply: async ({ request, locals }) => {
		if (!locals.user) return fail(403, { error: 'forbidden' });
		const dbUser = await getDbUser(locals.user.sub);
		if (!dbUser) return fail(403, { error: 'forbidden' });

		// Can't apply if you already lead or are a member.
		if (await getLedWorkshop(dbUser.id)) return fail(400, { error: 'you already run a workshop' });
		if (await getMembership(dbUser.id))
			return fail(400, { error: 'you’re already in a workshop — leave it before starting your own' });

		const form = await request.formData();
		const workshopName = (form.get('workshop_name') as string)?.trim();
		const organization = (form.get('organization') as string)?.trim() || null;
		const details = (form.get('details') as string)?.trim() || null;
		if (!workshopName) return fail(400, { error: 'give your workshop a name' });

		// Replace any prior pending application from this user.
		await db
			.delete(workshopApplications)
			.where(
				and(
					eq(workshopApplications.applicantId, dbUser.id),
					eq(workshopApplications.status, 'pending')
				)
			);

		await db.insert(workshopApplications).values({
			applicantId: dbUser.id,
			workshopName,
			organization,
			details
		});

		return { applied: true };
	},

	// Join a workshop with its code.
	join: async ({ request, locals }) => {
		if (!locals.user) return fail(403, { error: 'forbidden' });
		const dbUser = await getDbUser(locals.user.sub);
		if (!dbUser) return fail(403, { error: 'forbidden' });

		if (await getLedWorkshop(dbUser.id))
			return fail(400, { error: 'you run a workshop — you can’t also join one' });
		if (await getMembership(dbUser.id))
			return fail(400, { error: 'you’re already in a workshop' });

		const form = await request.formData();
		const code = (form.get('join_code') as string)?.trim().toUpperCase();
		if (!code) return fail(400, { error: 'enter a join code' });

		const [ws] = await db
			.select({ id: workshops.id, status: workshops.status, leaderId: workshops.leaderId })
			.from(workshops)
			.where(eq(workshops.joinCode, code))
			.limit(1);

		if (!ws) return fail(400, { error: 'no workshop found with that code' });
		if (ws.status !== 'active') return fail(400, { error: 'that workshop is closed' });
		if (ws.leaderId === dbUser.id) return fail(400, { error: 'that’s your own workshop' });

		await db.insert(workshopMembers).values({ workshopId: ws.id, userId: dbUser.id });
		return { joined: true };
	},

	// Leader endorses a member's pending submission (flags it for reviewers).
	endorse: async ({ request, locals }) => {
		if (!locals.user) return fail(403, { error: 'forbidden' });
		const dbUser = await getDbUser(locals.user.sub);
		if (!dbUser) return fail(403, { error: 'forbidden' });

		const led = await getLedWorkshop(dbUser.id);
		if (!led) return fail(403, { error: 'only workshop leaders can endorse' });

		const form = await request.formData();
		const approvalId = parseInt(form.get('approval_id') as string, 10);
		if (!approvalId || isNaN(approvalId)) return fail(400, { error: 'invalid submission' });

		// The approval must belong to a project owned by a member of THIS workshop,
		// and still be pending + un-endorsed. Verify membership to prevent endorsing
		// arbitrary submissions.
		const [row] = await db
			.select({
				approvalId: projectApprovals.id,
				status: projectApprovals.status,
				ownerId: projects.userId,
				memberWorkshop: workshopMembers.workshopId
			})
			.from(projectApprovals)
			.innerJoin(projects, eq(projectApprovals.projectId, projects.id))
			.leftJoin(workshopMembers, eq(workshopMembers.userId, projects.userId))
			.where(eq(projectApprovals.id, approvalId))
			.limit(1);

		if (!row || row.memberWorkshop !== led.id)
			return fail(403, { error: 'that submission isn’t from your workshop' });
		if (row.status !== 'pending')
			return fail(400, { error: 'you can only endorse submissions awaiting review' });

		await db
			.update(projectApprovals)
			.set({ endorsedAt: new Date(), endorsedById: dbUser.id })
			.where(and(eq(projectApprovals.id, approvalId), isNull(projectApprovals.endorsedAt)));

		return { endorsed: true };
	},

	// Leave a workshop (members only).
	leave: async ({ locals }) => {
		if (!locals.user) return fail(403, { error: 'forbidden' });
		const dbUser = await getDbUser(locals.user.sub);
		if (!dbUser) return fail(403, { error: 'forbidden' });
		await db.delete(workshopMembers).where(eq(workshopMembers.userId, dbUser.id));
		return { left: true };
	}
};
