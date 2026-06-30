<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const steps = ['/onboarding', '/onboarding/setup', '/onboarding/start'];
	const current = $derived(steps.indexOf(page.url.pathname));
</script>

<div class="onboarding">
	<main class="column">
		<nav class="steps-indicator" aria-label="onboarding progress">
			{#each steps as step, i (step)}
				<span class="step-dot" class:active={i <= current}></span>
			{/each}
		</nav>

		{@render children()}
	</main>
</div>

<style>
	/* Onboarding now wears the Boba Drops dark brown-sugar theme (caramel ground,
	   cream ink) like the rest of the app — no more onekey light override. */
	.onboarding {
		min-height: 100vh;
		background: var(--set-1);
		background-image: linear-gradient(168deg, var(--caramel), var(--caramel-deep));
		color: var(--ink);
		display: flex;
		justify-content: center;
		align-items: center;
		padding: clamp(2.5rem, 6vh, 6rem) clamp(1.25rem, 4vw, 3rem);
		box-sizing: border-box;
	}

	.column {
		width: 100%;
		max-width: 46rem;
		display: flex;
		flex-direction: column;
		gap: clamp(1rem, 2vw, 1.75rem);
	}

	.steps-indicator {
		display: flex;
		gap: 0.55rem;
		justify-content: flex-start;
		margin-bottom: clamp(0.5rem, 1vw, 1rem);
	}

	.step-dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 50%;
		background: rgba(255, 246, 230, 0.25);
		transition:
			background-color var(--transition-med),
			transform var(--transition-med);
	}

	.step-dot.active {
		background: var(--cream);
		transform: scale(1.05);
	}

	/* ---- shared building blocks used across the onboarding pages ---- */

	:global(.onboarding .ob-title) {
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(2rem, 3.4vw, 3.1rem);
		font-weight: 700;
		letter-spacing: -0.01em;
		line-height: 1.05;
		margin: 0;
		color: var(--ink);
	}

	:global(.onboarding .ob-card) {
		background: var(--set-3);
		border-radius: var(--radius);
		border: none;
		padding: clamp(1.25rem, 2vw, 2rem);
		box-sizing: border-box;
	}

	:global(.onboarding .ob-card-label) {
		display: block;
		font-size: 0.82rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--set-1-fg2);
		margin: 0 0 1.1rem;
		font-weight: 700;
	}

	:global(.onboarding .ob-text) {
		font-size: clamp(1rem, 1.1vw, 1.18rem);
		line-height: 1.7;
		margin: 0;
		color: var(--color-text-soft);
	}

	:global(.onboarding .ob-text + .ob-text) {
		margin-top: 1.1rem;
	}

	/* primary "next step" pill — cream fill, dims via .disabled */
	:global(.onboarding .ob-next) {
		align-self: flex-end;
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		text-decoration: none;
		background: var(--highlight);
		color: var(--set-1);
		font-weight: 700;
		border: 2px solid var(--highlight);
		border-radius: var(--radius-pill);
		padding: 0.7rem 1.4rem;
		font-size: clamp(1rem, 1.3vw, 1.25rem);
		font-family: var(--font-body);
		cursor: pointer;
		transition:
			background-color var(--transition-med),
			border-color var(--transition-med);
	}

	:global(.onboarding .ob-next:hover) {
		background: var(--highlight-2);
		border-color: var(--highlight-2);
		color: var(--set-1);
		text-decoration: none;
	}

	:global(.onboarding .ob-next svg) {
		transition: transform var(--transition-fast);
	}

	:global(.onboarding .ob-next:hover svg) {
		transform: translateX(0.15em);
	}

	:global(.onboarding .ob-next.disabled) {
		opacity: 0.45;
		cursor: not-allowed;
		pointer-events: none;
	}

	/* footer nav row: outlined back on the left, next on the right */
	:global(.onboarding .ob-nav) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
	}

	:global(.onboarding .ob-nav .ob-next) {
		align-self: auto;
	}

	:global(.onboarding .ob-back) {
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		text-decoration: none;
		background: transparent;
		color: var(--ink);
		font-weight: 700;
		border: 2px solid var(--set-3-fg2);
		border-radius: var(--radius-pill);
		padding: 0.7rem 1.4rem;
		font-size: clamp(1rem, 1.3vw, 1.25rem);
		font-family: var(--font-body);
		cursor: pointer;
		transition: border-color var(--transition-fast);
	}

	:global(.onboarding .ob-back:hover) {
		text-decoration: none;
		border-color: var(--cream);
	}

	:global(.onboarding .ob-back svg) {
		transform: scaleX(-1);
		transition: transform var(--transition-fast);
	}

	:global(.onboarding .ob-back:hover svg) {
		transform: scaleX(-1) translateX(0.1em);
	}

	@media (max-width: 767px) {
		.onboarding {
			align-items: flex-start;
		}

		:global(.onboarding .ob-next) {
			align-self: stretch;
			justify-content: center;
		}
	}
</style>
