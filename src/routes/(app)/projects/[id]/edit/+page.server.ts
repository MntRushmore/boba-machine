import { redirect, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects, users } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import {
	getOrSeedFiles,
	saveFile,
	deleteFile,
	isAllowedPath,
	fileCount,
	MAX_FILES
} from '$lib/server/editor';

async function ownedProject(hcaId: string, projectId: number) {
	const [u] = await db.select({ id: users.id }).from(users).where(eq(users.hcaId, hcaId)).limit(1);
	if (!u) return null;
	const [p] = await db
		.select()
		.from(projects)
		.where(and(eq(projects.id, projectId), eq(projects.userId, u.id)))
		.limit(1);
	return p ?? null;
}

export async function load({ locals, params }) {
	if (!locals.user) redirect(302, '/login');
	const id = parseInt(params.id, 10);
	if (isNaN(id)) error(404, 'project not found');

	const project = await ownedProject(locals.user.sub, id);
	if (!project) redirect(302, '/projects?error=not_found');

	const files = await getOrSeedFiles(id, project.name);

	return {
		project: {
			id: project.id,
			name: project.name,
			demoUrl: project.demoUrl,
			githubRepoUrl: project.githubRepoUrl,
			publishedAt: project.publishedAt
		},
		files,
		githubConnected: !!(locals.user.github_login ?? null)
	};
}

export const actions = {
	// Save one file's content (called by the editor autosave).
	save: async ({ request, locals, params }) => {
		if (!locals.user) return fail(403, { error: 'forbidden' });
		const id = parseInt(params.id, 10);
		const project = await ownedProject(locals.user.sub, id);
		if (!project) return fail(403, { error: 'forbidden' });

		const form = await request.formData();
		const path = (form.get('path') as string)?.trim();
		const content = (form.get('content') as string) ?? '';
		if (!isAllowedPath(path)) return fail(400, { error: 'invalid file path' });
		const ok = await saveFile(id, path, content);
		if (!ok) return fail(400, { error: 'could not save (file too large or invalid)' });
		return { saved: true };
	},

	create: async ({ request, locals, params }) => {
		if (!locals.user) return fail(403, { error: 'forbidden' });
		const id = parseInt(params.id, 10);
		const project = await ownedProject(locals.user.sub, id);
		if (!project) return fail(403, { error: 'forbidden' });

		const form = await request.formData();
		const path = (form.get('path') as string)?.trim();
		if (!isAllowedPath(path))
			return fail(400, { error: 'name must be like page.html / style.css (html, css, js, svg, json, txt, md)' });
		if ((await fileCount(id)) >= MAX_FILES) return fail(400, { error: `a site can have at most ${MAX_FILES} files` });
		await saveFile(id, path, '');
		return { created: path };
	},

	remove: async ({ request, locals, params }) => {
		if (!locals.user) return fail(403, { error: 'forbidden' });
		const id = parseInt(params.id, 10);
		const project = await ownedProject(locals.user.sub, id);
		if (!project) return fail(403, { error: 'forbidden' });

		const form = await request.formData();
		const path = (form.get('path') as string)?.trim();
		if (path === 'index.html') return fail(400, { error: 'index.html is required and can’t be deleted' });
		await deleteFile(id, path);
		return { removed: path };
	}
};
