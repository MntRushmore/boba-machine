import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects, users } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function load({ locals }) {
	if (!locals.isReviewer) error(403, 'Forbidden');

	const submitted = await db
		.select({
			id: projects.id,
			name: projects.name,
			description: projects.description,
			screenshotUrl: projects.screenshotUrl,
			repoUrl: projects.repoUrl,
			demoUrl: projects.demoUrl,
			hackatimeProject: projects.hackatimeProject,
			status: projects.status,
			createdAt: projects.createdAt,
			updatedAt: projects.updatedAt,
			submitterName: users.nickname,
			submitterSlack: users.slackDisplayName,
			submitterEmail: users.email,
		})
		.from(projects)
		.innerJoin(users, eq(projects.userId, users.id))
		.where(eq(projects.status, 'pending'))
		.orderBy(asc(projects.updatedAt));

	return { user: locals.user, submitted };
}
