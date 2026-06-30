<script lang="ts">
	import BobaRail from '$lib/components/nav/BobaRail.svelte';

	let { children } = $props();
</script>

<div class="dashboard">
	<BobaRail />
	<div class="work">
		<main class="content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		background-color: var(--set-1);
		color: var(--color-text);
	}

	.work {
		margin-left: 260px;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		position: relative;
	}

	.content {
		padding: clamp(1.75rem, 3vw, 3rem) clamp(1.5rem, 3.5vw, 3.5rem);
		width: 100%;
		max-width: 1140px;
		flex: 1;
		font-size: 1rem;
		box-sizing: border-box;
		margin: 0;
	}

	@media (max-width: 767px) {
		.work {
			margin-left: 0;
			margin-top: 52px;
			margin-bottom: 76px;
		}

		.content {
			padding: 1.25rem 1rem;
		}
	}
</style>
