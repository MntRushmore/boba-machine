import { db } from '$lib/server/db';
import { projects, users, projectApprovals, grants } from '$lib/server/db/schema';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';

export async function load({ locals }) {
	let mySites: {
		id: number;
		name: string;
		demoUrl: string | null;
		screenshotUrl: string | null;
		status: string;
	}[] = [];
	let approvedCount = 0;
	let inReviewCount = 0;
	let grantTotalCents = 0;
	let hasAddress = false;
	let hackatimeLinked = !!locals.user?.hackatime_linked;

	if (locals.user) {
		const [dbUser] = await db
			.select({
				id: users.id,
				street: users.streetAddress,
				locality: users.locality,
				country: users.country
			})
			.from(users)
			.where(eq(users.hcaId, locals.user.sub))
			.limit(1);

		if (dbUser) {
			hasAddress = !!(dbUser.street || dbUser.locality || dbUser.country);

			const rows = await db
				.select({
					id: projects.id,
					name: projects.name,
					demoUrl: projects.demoUrl,
					screenshotUrl: projects.screenshotUrl
				})
				.from(projects)
				.where(eq(projects.userId, dbUser.id))
				.orderBy(desc(projects.updatedAt));

			// Derive each site's status from its latest approval row.
			const ids = rows.map((r) => r.id);
			const latest = ids.length
				? await db
						.select({
							projectId: projectApprovals.projectId,
							status: projectApprovals.status,
							submittedAt: projectApprovals.submittedAt
						})
						.from(projectApprovals)
						.where(inArray(projectApprovals.projectId, ids))
						.orderBy(desc(projectApprovals.submittedAt))
				: [];
			const statusByProject = new Map<number, string>();
			for (const a of latest) if (!statusByProject.has(a.projectId)) statusByProject.set(a.projectId, a.status);

			mySites = rows.map((r) => {
				let status = statusByProject.get(r.id) ?? 'draft';
				if (status === 'soft_approved') status = 'pending'; // authors never see soft state
				return { ...r, status };
			});
			approvedCount = mySites.filter((s) => s.status === 'approved').length;
			inReviewCount = mySites.filter((s) => s.status === 'pending').length;

			const [g] = await db
				.select({ cents: sql<number>`coalesce(sum(${grants.amountCents}), 0)::int` })
				.from(grants)
				.where(eq(grants.userId, dbUser.id));
			grantTotalCents = Number(g?.cents ?? 0);
		}
	}

	const [cSites] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(projectApprovals)
		.where(eq(projectApprovals.status, 'approved'));
	const [cGrants] = await db
		.select({ cents: sql<number>`coalesce(sum(${grants.amountCents}), 0)::int` })
		.from(grants);

	return {
		user: locals.user,
		mySites,
		approvedCount,
		inReviewCount,
		grantTotalCents,
		hasAddress,
		hackatimeLinked,
		communitySites: Number(cSites?.n ?? 0),
		communityGrantCents: Number(cGrants?.cents ?? 0),
		hasProject: mySites.length > 0
	};
}
