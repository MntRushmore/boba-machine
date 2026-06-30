import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { decryptToken, encryptionKey } from '$lib/server/session';
import type { users as usersTable } from '$lib/server/db/schema';
import type { SiteFile } from '$lib/server/editor';

const API = 'https://api.github.com';

type DbUser = typeof usersTable.$inferSelect;

export function githubToken(user: DbUser): string | null {
	if (!user.githubTokenCt || !user.githubTokenIv || !user.githubTokenTag) return null;
	const encKey = encryptionKey();
	try {
		return decryptToken(user.githubTokenCt, user.githubTokenIv, user.githubTokenTag, encKey);
	} catch {
		return null;
	}
}

async function gh(token: string, path: string, init?: RequestInit) {
	const res = await fetch(`${API}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			...(init?.body ? { 'Content-Type': 'application/json' } : {}),
			...init?.headers
		}
	});
	return res;
}

// Turn a project name into a valid, lowercase repo slug.
export function repoSlug(name: string): string {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return base || 'boba-site';
}

export interface PublishResult {
	repoFullName: string; // owner/repo
	repoUrl: string;
	pagesUrl: string;
}

/**
 * Publish a site to the user's GitHub: ensure the repo exists, push all files as
 * a single commit to the default branch, and enable GitHub Pages. Returns the
 * repo + Pages URLs. Throws with a friendly message on failure.
 *
 * `existingRepo` ("owner/repo") is reused when the project was published before
 * so we update in place instead of creating a new repo each time.
 */
export async function publishSite(
	user: DbUser,
	projectName: string,
	files: SiteFile[],
	existingRepo: string | null
): Promise<PublishResult> {
	const token = githubToken(user);
	if (!token) throw new Error('connect your GitHub account first');
	if (!user.githubLogin) throw new Error('GitHub account not linked');
	if (!files.some((f) => f.path === 'index.html'))
		throw new Error('your site needs an index.html before publishing');

	const owner = user.githubLogin;
	let repo = existingRepo?.split('/')[1] ?? null;

	// 1. Ensure the repo exists.
	if (repo) {
		const check = await gh(token, `/repos/${owner}/${repo}`);
		if (!check.ok) repo = null; // it was deleted on GitHub's side — recreate
	}
	if (!repo) {
		const slug = repoSlug(projectName);
		// find a free name
		let candidate = slug;
		for (let i = 1; i < 50; i++) {
			const exists = await gh(token, `/repos/${owner}/${candidate}`);
			if (exists.status === 404) break;
			candidate = `${slug}-${i}`;
		}
		repo = candidate;
		const create = await gh(token, `/user/repos`, {
			method: 'POST',
			body: JSON.stringify({
				name: repo,
				description: `${projectName} — made with Boba Drops 🧋`,
				auto_init: true,
				homepage: `https://${owner}.github.io/${repo}/`
			})
		});
		if (!create.ok) throw new Error(`couldn't create the GitHub repo (${create.status})`);
	}

	const fullName = `${owner}/${repo}`;

	// 2. Find the default branch + its current commit/tree.
	const repoInfoRes = await gh(token, `/repos/${fullName}`);
	if (!repoInfoRes.ok) throw new Error('couldn’t read the repo');
	const repoInfo = await repoInfoRes.json();
	const branch: string = repoInfo.default_branch ?? 'main';

	const refRes = await gh(token, `/repos/${fullName}/git/ref/heads/${branch}`);
	let baseTreeSha: string | undefined;
	let parentSha: string | undefined;
	if (refRes.ok) {
		const ref = await refRes.json();
		parentSha = ref.object.sha;
		const commitRes = await gh(token, `/repos/${fullName}/git/commits/${parentSha}`);
		if (commitRes.ok) baseTreeSha = (await commitRes.json()).tree.sha;
	}

	// 3. Create blobs for each file, then a tree, then a commit.
	const treeItems = await Promise.all(
		files.map(async (f) => {
			const blobRes = await gh(token, `/repos/${fullName}/git/blobs`, {
				method: 'POST',
				body: JSON.stringify({ content: f.content, encoding: 'utf-8' })
			});
			if (!blobRes.ok) throw new Error(`failed to upload ${f.path}`);
			const blob = await blobRes.json();
			return { path: f.path, mode: '100644', type: 'blob', sha: blob.sha };
		})
	);

	const treeRes = await gh(token, `/repos/${fullName}/git/trees`, {
		method: 'POST',
		body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems })
	});
	if (!treeRes.ok) throw new Error('failed to build the file tree');
	const tree = await treeRes.json();

	const commitRes = await gh(token, `/repos/${fullName}/git/commits`, {
		method: 'POST',
		body: JSON.stringify({
			message: 'Publish from Boba Drops 🧋',
			tree: tree.sha,
			parents: parentSha ? [parentSha] : []
		})
	});
	if (!commitRes.ok) throw new Error('failed to create the commit');
	const commit = await commitRes.json();

	// 4. Move the branch ref to the new commit (create it if missing).
	const updateRef = await gh(token, `/repos/${fullName}/git/refs/heads/${branch}`, {
		method: 'PATCH',
		body: JSON.stringify({ sha: commit.sha, force: true })
	});
	if (!updateRef.ok) {
		const createRef = await gh(token, `/repos/${fullName}/git/refs`, {
			method: 'POST',
			body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha })
		});
		if (!createRef.ok) throw new Error('failed to update the branch');
	}

	// 5. Enable Pages from the branch root (ignore "already enabled" 409).
	const pagesRes = await gh(token, `/repos/${fullName}/pages`, {
		method: 'POST',
		body: JSON.stringify({ source: { branch, path: '/' } })
	});
	if (!pagesRes.ok && pagesRes.status !== 409) {
		// 409 = already enabled; anything else we surface but don't hard-fail the push.
		console.warn(`[github] enabling Pages returned ${pagesRes.status}`);
	}

	return {
		repoFullName: fullName,
		repoUrl: `https://github.com/${fullName}`,
		pagesUrl: `https://${owner}.github.io/${repo}/`
	};
}
