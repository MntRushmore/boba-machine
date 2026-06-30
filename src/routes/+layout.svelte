<script lang="ts">
	import '../app.css';
	import NavigationProgress from '$lib/components/NavigationProgress.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Boba Drops</title>
	<link rel="icon" type="image/png" href="/img/boba-favicon.png" />
</svelte:head>

<NavigationProgress />

{@render children()}
