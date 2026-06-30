<script lang="ts">
	// The root route redirects server-side (see +page.server.ts) — the public
	// landing lives at boba.hackclub.com. This is only a brief fallback shown if a
	// client lands here before the redirect resolves.
</script>

<svelte:head>
	<title>Boba Drops</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="splash">
	<img src="/img/boba-logo.svg" alt="Boba Drops" />
	<p>taking you to Boba Drops…</p>
	<a href="/login" class="button filled">log in</a>
</div>

<style>
	.splash {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		background: linear-gradient(160deg, var(--caramel), var(--caramel-deep));
		text-align: center;
		padding: 2rem;
	}
	.splash img {
		width: min(360px, 70vw);
		filter: drop-shadow(0 6px 0 rgba(76, 42, 13, 0.4));
	}
	.splash p {
		color: var(--cream-soft);
		margin: 0;
	}
</style>
