<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>onekey</title>
	<link rel="icon" type="image/x-icon" href="/favicon.ico" />
</svelte:head>

<!-- BETA BANNER: remove this block when out of beta -->
<div style="background:black;color:white;text-align:center;padding:16px 24px;font-size:0.875rem;font-weight:600;letter-spacing:0.02em;z-index:15;">
	BETA &mdash; this is a testing environment, projects will not be submitted to unified db and prizes will not be paid out.
</div>
<!-- END BETA BANNER -->

{@render children()}
