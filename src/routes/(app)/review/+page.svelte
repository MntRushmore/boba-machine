<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>onekey - reviewer</title>
</svelte:head>

<div class="reviewer">
	<div class="header">
		<h1>review panel</h1>
		<p class="sub">
			logged in as <strong
				>@{data.user?.slack_display_name ??
					data.user?.nickname ??
					data.user?.name ??
					data.user?.email}</strong
			>
		</p>
	</div>

	{#if data.submitted.length === 0}
		<div class="placeholder">
			<p>no projects pending review.</p>
		</div>
	{:else}
		<div class="project-list">
			{#each data.submitted as project (project.id)}
				<div class="project-row">
					{#if project.screenshotUrl}
						<img
							src={project.screenshotUrl}
							alt="{project.name} screenshot"
							class="project-thumb"
						/>
					{:else}
						<div class="project-thumb project-thumb-empty"></div>
					{/if}
					<div class="project-info">
						<span class="project-name"
							>{project.name}
							<span class="project-submitter"
								>by {project.submitterSlack ??
									project.submitterName ??
									project.submitterEmail ??
									'unknown'}</span
							></span
						>
						{#if project.description}
							<p class="project-desc">{project.description}</p>
						{/if}
						<div class="project-links">
							{#if project.repoUrl}
								<a href={project.repoUrl} target="_blank" rel="noopener noreferrer" class="ext-link"
									>repo</a
								>
							{/if}
							{#if project.demoUrl}
								<a href={project.demoUrl} target="_blank" rel="noopener noreferrer" class="ext-link"
									>demo</a
								>
							{/if}
						</div>
					</div>
					<a href="/projects/{project.id}" class="btn-view">view project</a>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.reviewer {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.header h1 {
		font-size: clamp(1.6rem, 3vw, 2.4rem);
		font-weight: 700;
		margin: 0 0 0.25rem;
		letter-spacing: -0.01em;
	}

	.sub {
		font-size: 0.95rem;
		color: var(--color-text-soft);
		margin: 0;
	}

	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1.5px dashed #2a2f38;
		border-radius: 12px;
		padding: 4rem 2rem;
		color: var(--color-text-soft);
		font-size: 0.95rem;
	}

	.placeholder p {
		margin: 0;
	}

	.project-list {
		display: flex;
		flex-direction: column;
		gap: 0;
		border: solid var(--border-width);
		border-radius: var(--radius-card);
		overflow: hidden;
	}

	.project-row {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 1rem 1.25rem;
		border-bottom: solid calc(var(--border-width) / 2)
			color-mix(in srgb, var(--color-text) 10%, transparent);
	}

	.project-row:last-child {
		border-bottom: none;
	}

	.project-thumb {
		width: 5rem;
		height: 3.5rem;
		object-fit: cover;
		border-radius: calc(var(--radius-card) / 2);
		flex-shrink: 0;
	}

	.project-thumb-empty {
		background: #2a2a2a;
	}

	.project-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		flex: 1;
		min-width: 0;
	}

	.project-name {
		font-weight: 700;
		font-size: 1.1rem;
	}

	.project-submitter {
		font-size: 1rem;
		font-weight: 400;
		color: #888;
	}

	.project-desc {
		font-size: 0.85rem;
		color: var(--color-text-soft);
		margin: 0.1rem 0 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.project-links {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.2rem;
	}

	.ext-link {
		font-size: 0.75rem;
		color: var(--rail-label);
		text-decoration: none;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.ext-link:hover {
		color: var(--color-text);
	}

	.btn-view {
		flex-shrink: 0;
		font-size: 0.8rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		text-decoration: none;
		border: solid var(--border-width) black;
		border-radius: var(--radius-pill);
		padding: 0.4rem 0.9rem;
		color: var(--color-text);
		background: var(--color-bg);
		white-space: nowrap;
		transition:
			0.3s color,
			0.3s background-color,
			0.3s border-color;
	}

	.btn-view:hover {
		background: var(--color-text);
		color: var(--color-bg);
		border-color: var(--color-text);
	}
</style>
