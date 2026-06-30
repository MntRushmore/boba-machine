import { db } from '$lib/server/db';
import { projectFiles } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export type SiteFile = { path: string; content: string };

// Files allowed in a Boba Drops site (it's an HTML/CSS YSWS). Kept tight so the
// editor + publish stay simple and the sandbox preview is predictable.
export const ALLOWED_EXTENSIONS = ['html', 'css', 'js', 'svg', 'json', 'txt', 'md'];
export const MAX_FILES = 30;
export const MAX_FILE_BYTES = 200 * 1024;

export function extOf(path: string): string {
	const i = path.lastIndexOf('.');
	return i === -1 ? '' : path.slice(i + 1).toLowerCase();
}

export function isAllowedPath(path: string): boolean {
	const p = path.trim();
	if (!p || p.length > 100) return false;
	// no leading slash, no traversal, no nested dirs beyond one level, safe chars
	if (p.startsWith('/') || p.includes('..') || p.includes('\\')) return false;
	if (!/^[a-zA-Z0-9._/-]+$/.test(p)) return false;
	if ((p.match(/\//g) ?? []).length > 1) return false;
	return ALLOWED_EXTENSIONS.includes(extOf(p));
}

// The friendly starter a new site opens with — a real personal-site skeleton so
// a first-timer isn't staring at a blank file.
export function starterFiles(name: string): SiteFile[] {
	const safe = (name || 'my site').replace(/</g, '&lt;');
	return [
		{
			path: 'index.html',
			content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safe}</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <main>
      <h1>hi, i'm <span class="name">your name</span> 👋</h1>
      <p>welcome to my first website! i made this with Boba Drops.</p>
      <a class="btn" href="https://hack.club/boba">about Boba Drops</a>
    </main>
  </body>
</html>
`
		},
		{
			path: 'style.css',
			content: `:root { --accent: #c76b0f; }

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: system-ui, sans-serif;
  background: #fff8ec;
  color: #3a2009;
}

main { text-align: center; padding: 2rem; max-width: 32rem; }

h1 { font-size: 2.5rem; margin: 0 0 0.5rem; }

.name { color: var(--accent); }

.btn {
  display: inline-block;
  margin-top: 1.5rem;
  padding: 0.7rem 1.4rem;
  border-radius: 999px;
  background: var(--accent);
  color: white;
  text-decoration: none;
  font-weight: 700;
}
`
		}
	];
}

/** Load a project's files, seeding the starter template on first open. */
export async function getOrSeedFiles(projectId: number, projectName: string): Promise<SiteFile[]> {
	const rows = await db
		.select({ path: projectFiles.path, content: projectFiles.content })
		.from(projectFiles)
		.where(eq(projectFiles.projectId, projectId));

	if (rows.length > 0) {
		// index.html first, then alphabetical — a stable, friendly order.
		return rows.sort((a, b) =>
			a.path === 'index.html' ? -1 : b.path === 'index.html' ? 1 : a.path.localeCompare(b.path)
		);
	}

	const starter = starterFiles(projectName);
	await db.insert(projectFiles).values(starter.map((f) => ({ projectId, path: f.path, content: f.content })));
	return starter;
}

/** Upsert a single file's content. Returns false if the path/size is invalid. */
export async function saveFile(projectId: number, path: string, content: string): Promise<boolean> {
	if (!isAllowedPath(path)) return false;
	if (new TextEncoder().encode(content).length > MAX_FILE_BYTES) return false;

	await db
		.insert(projectFiles)
		.values({ projectId, path, content })
		.onConflictDoUpdate({
			target: [projectFiles.projectId, projectFiles.path],
			set: { content, updatedAt: new Date() }
		});
	return true;
}

export async function deleteFile(projectId: number, path: string): Promise<void> {
	await db
		.delete(projectFiles)
		.where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, path)));
}

export async function fileCount(projectId: number): Promise<number> {
	const rows = await db
		.select({ path: projectFiles.path })
		.from(projectFiles)
		.where(eq(projectFiles.projectId, projectId));
	return rows.length;
}
