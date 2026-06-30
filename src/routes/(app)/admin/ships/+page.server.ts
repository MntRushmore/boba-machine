import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projectApprovals, projects, users } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

const pickName = (
	row: { display: string | null; nick: string | null; name: string | null; email: string | null } | null
) => row?.display || row?.nick || row?.name || row?.email || null;

export async function load({ locals }) {
	if (!locals.isAdmin) error(403, 'Forbidden');

	const submitter = db
		.select({
			id: users.id,
			display: users.slackDisplayName,
			nick: users.nickname,
			name: users.name,
			email: users.email
		})
		.from(users)
		.as('submitter');

	const reviewer = db
		.select({
			id: users.id,
			display: users.slackDisplayName,
			nick: users.nickname,
			name: users.name,
			email: users.email
		})
		.from(users)
		.as('reviewer');

	const rows = await db
		.select({
			id: projectApprovals.id,
			projectId: projectApprovals.projectId,
			projectName: projects.name,
			status: projectApprovals.status,
			submissionType: projectApprovals.submissionType,
			publicMessage: projectApprovals.publicMessage,
			submittedAt: projectApprovals.submittedAt,
			reviewedAt: projectApprovals.reviewedAt,
			submitterDisplay: submitter.display,
			submitterNick: submitter.nick,
			submitterName: submitter.name,
			submitterEmail: submitter.email,
			reviewerDisplay: reviewer.display,
			reviewerNick: reviewer.nick,
			reviewerName: reviewer.name,
			reviewerEmail: reviewer.email
		})
		.from(projectApprovals)
		.innerJoin(projects, eq(projectApprovals.projectId, projects.id))
		.leftJoin(submitter, eq(projectApprovals.submittedById, submitter.id))
		.leftJoin(reviewer, eq(projectApprovals.reviewerId, reviewer.id))
		.orderBy(desc(projectApprovals.submittedAt));

	const ships = rows.map((r) => ({
		id: r.id,
		projectId: r.projectId,
		projectName: r.projectName,
		status: r.status,
		submissionType: r.submissionType,
		publicMessage: r.publicMessage,
		submittedAt: r.submittedAt,
		reviewedAt: r.reviewedAt,
		submitter: pickName({
			display: r.submitterDisplay,
			nick: r.submitterNick,
			name: r.submitterName,
			email: r.submitterEmail
		}),
		reviewer: pickName({
			display: r.reviewerDisplay,
			nick: r.reviewerNick,
			name: r.reviewerName,
			email: r.reviewerEmail
		})
	}));

	const counts = ships.reduce<Record<string, number>>((acc, s) => {
		acc[s.status] = (acc[s.status] ?? 0) + 1;
		return acc;
	}, {});

	return { ships, counts, total: ships.length };
}
