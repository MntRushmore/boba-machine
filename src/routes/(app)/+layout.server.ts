import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects, users, projectApprovals, grants } from '$lib/server/db/schema';
import { eq, and, count, sql } from 'drizzle-orm';
import { getLedWorkshop, getMembership } from '$lib/server/workshops';

export async function load({ locals }) {
	if (!locals.user) redirect(302, '/?needs_auth=1');
	// First-time users are walked through the onboarding flow before any dashboard page.
	if (!locals.user.onboarded) redirect(302, '/onboarding');

	const [dbUser] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.hcaId, locals.user.sub))
		.limit(1);

	// Boba Drops counts approved sites and the grants they earned, not hours.
	let approvedSiteCount = 0;
	let grantCount = 0;
	let grantTotalCents = 0;
	let leadsWorkshop = false;
	let inWorkshop = false;

	if (dbUser) {
		const [led, membership] = await Promise.all([
			getLedWorkshop(dbUser.id),
			getMembership(dbUser.id)
		]);
		leadsWorkshop = !!led;
		inWorkshop = !!membership;

		const [a] = await db
			.select({ total: count() })
			.from(projectApprovals)
			.innerJoin(projects, eq(projectApprovals.projectId, projects.id))
			.where(and(eq(projects.userId, dbUser.id), eq(projectApprovals.status, 'approved')));
		approvedSiteCount = Number(a?.total ?? 0);

		const [g] = await db
			.select({
				n: count(),
				cents: sql<number>`coalesce(sum(${grants.amountCents}), 0)::int`
			})
			.from(grants)
			.where(eq(grants.userId, dbUser.id));
		grantCount = Number(g?.n ?? 0);
		grantTotalCents = Number(g?.cents ?? 0);
	}

	// How much boba the whole community has earned — used by the home dashboard.
	const [c] = await db
		.select({ cents: sql<number>`coalesce(sum(${grants.amountCents}), 0)::int` })
		.from(grants);
	const communityGrantCents = Number(c?.cents ?? 0);

	return {
		user: locals.user,
		isAdmin: locals.isAdmin,
		isReviewer: locals.isReviewer,
		leadsWorkshop,
		inWorkshop,
		approvedSiteCount,
		grantCount,
		grantTotalCents,
		communityGrantCents,
		// Legacy fields kept at 0 so any remaining hours UI renders harmlessly.
		userAvailableSeconds: 0,
		communityApprovedSeconds: 0
	};
}
