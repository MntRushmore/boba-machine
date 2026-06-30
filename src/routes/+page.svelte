<script lang="ts">
	// The root route redirects to /login server-side UNLESS the URL carries a
	// status flag (auth error / needs-auth / locked) — in which case it lands here
	// and shows the message, so an auth failure can't loop back into /login.
	let { data } = $props();

	const message = $derived(
		data?.authError === 'session_expired'
			? 'your login session expired — please try again.'
			: data?.authError
				? 'something went wrong signing in — please try again.'
				: data?.locked
					? "Boba Drops isn't open yet — hang tight!"
					: data?.needsAuth
						? 'please log in to continue.'
						: ''
	);
</script>

<svelte:head>
	<title>Boba Drops</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="splash">
	<img src="/img/boba-logo.svg" alt="Boba Drops" />
	{#if message}
		<p class="msg">{message}</p>
	{:else}
		<p>build your first website, get free boba 🧋</p>
	{/if}
	<a href="/login" class="button filled" data-sveltekit-reload>log in</a>
	{#if message}
		<button
			type="button"
			class="reset"
			onclick={() => {
				// Clear our own session cookie + retry from a clean slate. (Won't
				// touch auth.hackclub.com's cookies — if the loop is there, sign out
				// from auth.hackclub.com directly.)
				document.cookie = 'hca_session=; Max-Age=0; path=/';
				document.cookie = 'hca_state=; Max-Age=0; path=/';
				window.location.href = '/login';
			}}
		>
			clear &amp; start fresh
		</button>
	{/if}
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
		font-size: 1.05rem;
	}
	.msg {
		color: var(--ink);
		font-weight: 600;
	}
	.reset {
		background: transparent;
		border: none;
		color: var(--cream-soft);
		font-size: 0.85rem;
		text-decoration: underline;
		cursor: pointer;
		opacity: 0.8;
	}
	.reset:hover {
		opacity: 1;
	}
</style>
