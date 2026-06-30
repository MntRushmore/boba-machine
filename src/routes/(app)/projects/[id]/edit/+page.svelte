<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';

	let { data } = $props();

	type SiteFile = { path: string; content: string };
	let files = $state<SiteFile[]>(data.files.map((f) => ({ ...f })));
	let activePath = $state(files[0]?.path ?? 'index.html');
	let saveState = $state<'idle' | 'saving' | 'saved'>('idle');
	let creating = $state(false);
	let newName = $state('');
	let createError = $state('');

	let editorEl: HTMLDivElement;
	// monaco types are loaded lazily (browser only), so keep these loose.
	let editor: any = null;
	let monacoMod: any = null;
	let previewSrc = $state('');
	let previewUrl: string | null = null;

	const activeFile = $derived(files.find((f) => f.path === activePath) ?? files[0]);

	// ── live preview: assemble index.html with its sibling css/js inlined so
	// relative refs resolve inside the sandboxed blob iframe ──
	function buildPreview(): string {
		const index = files.find((f) => f.path === 'index.html');
		if (!index) return '<!doctype html><p style="font-family:sans-serif;padding:2rem">add an index.html to preview</p>';
		let html = index.content;
		for (const f of files) {
			if (f.path.endsWith('.css')) {
				const re = new RegExp(`<link[^>]*href=["']\\.?/?${f.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi');
				html = html.replace(re, `<style>\n${f.content}\n</style>`);
			}
			if (f.path.endsWith('.js')) {
				const re = new RegExp(`<script[^>]*src=["']\\.?/?${f.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*><\\/script>`, 'gi');
				html = html.replace(re, `<script>\n${f.content}\n<\/script>`);
			}
		}
		return html;
	}

	function refreshPreview() {
		const blob = new Blob([buildPreview()], { type: 'text/html' });
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = URL.createObjectURL(blob);
		previewSrc = previewUrl;
	}

	// ── autosave (debounced) ──
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	function scheduleSave(path: string, content: string) {
		saveState = 'saving';
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => void doSave(path, content), 700);
	}
	async function doSave(path: string, content: string) {
		const body = new FormData();
		body.set('path', path);
		body.set('content', content);
		const res = await fetch('?/save', { method: 'POST', body });
		saveState = res.ok ? 'saved' : 'idle';
		if (res.ok) setTimeout(() => (saveState = 'idle'), 1500);
	}

	async function selectFile(path: string) {
		if (path === activePath) return;
		// flush current model into state before switching
		if (editor) syncFromEditor();
		activePath = path;
		await tick();
		mountModel();
	}

	function syncFromEditor() {
		if (!editor) return;
		const val = editor.getValue();
		const f = files.find((x) => x.path === activePath);
		if (f && f.content !== val) f.content = val;
	}

	function mountModel() {
		if (!editor || !monacoMod) return;
		const f = files.find((x) => x.path === activePath);
		if (!f) return;
		const model = monacoMod.monaco.editor.createModel(
			f.content,
			monacoMod.languageForPath(f.path)
		);
		editor.setModel(model);
	}

	onMount(async () => {
		monacoMod = await import('$lib/monaco');
		editor = monacoMod.monaco.editor.create(editorEl, {
			value: activeFile?.content ?? '',
			language: monacoMod.languageForPath(activePath),
			theme: 'vs-dark',
			fontSize: 13,
			minimap: { enabled: false },
			automaticLayout: true,
			scrollBeyondLastLine: false,
			tabSize: 2
		});
		editor.onDidChangeModelContent(() => {
			const f = files.find((x) => x.path === activePath);
			if (!f) return;
			f.content = editor.getValue();
			refreshPreview();
			scheduleSave(f.path, f.content);
		});
		refreshPreview();
	});

	onDestroy(() => {
		clearTimeout(saveTimer);
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		editor?.dispose();
	});

	async function createFile() {
		createError = '';
		const body = new FormData();
		body.set('path', newName.trim());
		const res = await fetch('?/create', { method: 'POST', body });
		const result = await res.json();
		if (result.type === 'failure') {
			createError = result.data ? JSON.parse(result.data)[1] ?? 'invalid' : 'invalid';
			return;
		}
		files = [...files, { path: newName.trim(), content: '' }];
		creating = false;
		const created = newName.trim();
		newName = '';
		selectFile(created);
	}

	async function removeFile(path: string) {
		if (path === 'index.html') return;
		const body = new FormData();
		body.set('path', path);
		await fetch('?/remove', { method: 'POST', body });
		files = files.filter((f) => f.path !== path);
		if (activePath === path) {
			activePath = files[0]?.path ?? 'index.html';
			await tick();
			mountModel();
		}
		refreshPreview();
	}
</script>

<svelte:head><title>editing {data.project.name} — Boba Drops</title></svelte:head>

<div class="editor-page">
	<header class="bar">
		<a class="back" href="/projects/{data.project.id}">← {data.project.name}</a>
		<span class="save-state" class:on={saveState !== 'idle'}>
			{saveState === 'saving' ? 'saving…' : saveState === 'saved' ? 'saved ✓' : ''}
		</span>
		<div class="bar-right">
			<a class="action-btn action-btn--secondary action-btn--small" href="/projects/{data.project.id}">done</a>
			<a class="action-btn action-btn--primary action-btn--small" href="/projects/{data.project.id}#publish">publish →</a>
		</div>
	</header>

	<div class="split">
		<div class="code-pane">
			<div class="tabs">
				{#each files as f (f.path)}
					<button class="tab" class:active={f.path === activePath} onclick={() => selectFile(f.path)}>
						{f.path}
						{#if f.path !== 'index.html'}
							<span
								class="tab-x"
								role="button"
								tabindex="0"
								aria-label="delete {f.path}"
								onclick={(e) => { e.stopPropagation(); removeFile(f.path); }}
								onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); removeFile(f.path); } }}
							>×</span>
						{/if}
					</button>
				{/each}
				{#if creating}
					<span class="new-file">
						<!-- svelte-ignore a11y_autofocus -->
						<input
							class="new-input"
							bind:value={newName}
							placeholder="page.html"
							autofocus
							onkeydown={(e) => { if (e.key === 'Enter') createFile(); if (e.key === 'Escape') creating = false; }}
						/>
						<button class="new-go" onclick={createFile}>add</button>
					</span>
				{:else}
					<button class="tab tab-add" onclick={() => { creating = true; newName = ''; createError = ''; }}>+ file</button>
				{/if}
			</div>
			{#if createError}<p class="create-error">{createError}</p>{/if}
			<div class="monaco" bind:this={editorEl}></div>
		</div>

		<div class="preview-pane">
			<div class="preview-bar">
				<span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
				<span class="preview-label">live preview</span>
			</div>
			<iframe class="preview" title="live preview" src={previewSrc} sandbox="allow-scripts"></iframe>
		</div>
	</div>
</div>

<style>
	/* take over the full content area */
	.editor-page {
		position: fixed;
		inset: 0;
		left: 260px;
		display: flex;
		flex-direction: column;
		background: var(--set-1);
	}
	@media (max-width: 767px) {
		.editor-page {
			left: 0;
			top: 52px;
			bottom: 76px;
		}
	}

	.bar {
		display: flex;
		align-items: center;
		gap: var(--space-m);
		padding: 10px 18px;
		border-bottom: 1px solid var(--color-line);
		background: var(--set-2);
	}
	.back {
		text-decoration: none;
		color: var(--ink);
		font-weight: 600;
		font-family: var(--font-display);
		font-style: italic;
	}
	.save-state {
		font-size: 0.8rem;
		color: var(--set-1-fg2);
		opacity: 0;
		transition: opacity 0.2s;
	}
	.save-state.on {
		opacity: 1;
	}
	.bar-right {
		margin-left: auto;
		display: flex;
		gap: 8px;
	}

	.split {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		min-height: 0;
	}
	@media (max-width: 900px) {
		.split {
			grid-template-columns: 1fr;
			grid-template-rows: 1fr 1fr;
		}
	}

	.code-pane {
		display: flex;
		flex-direction: column;
		min-width: 0;
		border-right: 1px solid var(--color-line);
	}
	.tabs {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px 8px 0;
		background: var(--set-2);
		overflow-x: auto;
	}
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px;
		border: none;
		border-radius: 8px 8px 0 0;
		background: transparent;
		color: var(--set-3-fg2);
		font-family: var(--font-body);
		font-size: 0.85rem;
		cursor: pointer;
		white-space: nowrap;
	}
	.tab.active {
		background: var(--set-1);
		color: var(--ink);
	}
	.tab-add {
		color: var(--cream);
	}
	.tab-x {
		opacity: 0.5;
		font-size: 1rem;
		line-height: 1;
	}
	.tab-x:hover {
		opacity: 1;
		color: var(--berry);
	}
	.new-file {
		display: inline-flex;
		gap: 4px;
		padding: 4px;
	}
	.new-input {
		background: var(--set-1);
		border: 1px solid var(--set-2-fg2);
		border-radius: 6px;
		color: var(--ink);
		padding: 4px 8px;
		font-size: 0.82rem;
		width: 9rem;
	}
	.new-go {
		background: var(--cream);
		color: var(--set-1);
		border: none;
		border-radius: 6px;
		padding: 0 10px;
		font-weight: 700;
		cursor: pointer;
	}
	.create-error {
		margin: 0;
		padding: 6px 14px;
		background: var(--berry-soft);
		color: var(--berry);
		font-size: 0.82rem;
	}
	.monaco {
		flex: 1;
		min-height: 0;
	}

	.preview-pane {
		display: flex;
		flex-direction: column;
		min-width: 0;
		background: #fff;
	}
	.preview-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 9px 14px;
		background: var(--set-2);
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.dot.red {
		background: #ff5f57;
	}
	.dot.yellow {
		background: #ffbd2e;
	}
	.dot.green {
		background: #28c840;
	}
	.preview-label {
		margin-left: 8px;
		font-size: 0.78rem;
		color: var(--set-1-fg2);
	}
	.preview {
		flex: 1;
		border: none;
		width: 100%;
		background: #fff;
	}
</style>
