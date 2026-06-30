<script lang="ts">
	import { page } from '$app/state';

	// Line icons, sized to sit inside the circular accent wrapper.
	const homeSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/></svg>`;
	const projectsSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9h17"/></svg>`;
	const exploreSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2z"/></svg>`;
	const guidesSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.5C10.5 5.3 8.5 4.8 4 5v13c4.5-.2 6.5.3 8 1.5"/><path d="M12 6.5C13.5 5.3 15.5 4.8 20 5v13c-4.5-.2-6.5.3-8 1.5"/><path d="M12 6.5v13"/></svg>`;
	const workshopsSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 6a3 3 0 0 1 0 6"/><path d="M17 14.5a5.5 5.5 0 0 1 3.5 5.5"/></svg>`;
	const reviewSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11.5 11.5 14 16 8.5"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>`;
	const grantsSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v20"/><path d="M16.5 6H9.8a3.2 3.2 0 0 0 0 6.4h4.4a3.2 3.2 0 0 1 0 6.4H7"/></svg>`;
	const adminSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/></svg>`;

	type NavItem = { label: string; svg: string; href: string };

	const mainItems: NavItem[] = [
		{ label: 'home', href: '/home', svg: homeSvg },
		{ label: 'my sites', href: '/projects', svg: projectsSvg },
		{ label: 'explore', href: '/explore', svg: exploreSvg },
		{ label: 'guides', href: '/guides', svg: guidesSvg },
		{ label: 'workshops', href: '/workshops', svg: workshopsSvg }
	];

	const isReviewer = $derived(!!page.data.isReviewer);
	const isAdmin = $derived(!!page.data.isAdmin);

	const staffItems = $derived(
		[
			isReviewer ? { label: 'review', href: '/review', svg: reviewSvg } : null,
			isAdmin ? { label: 'grants', href: '/admin/grants', svg: grantsSvg } : null,
			isAdmin ? { label: 'admin', href: '/admin', svg: adminSvg } : null
		].filter(Boolean) as NavItem[]
	);

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}

	const initial = $derived(
		(page.data.user?.nickname || page.data.user?.name || '?').trim().charAt(0).toUpperCase()
	);
</script>

<!-- mobile top bar -->
<div class="mobile-topbar">
	<a href="/home" class="m-brand" aria-label="Boba Drops home">
		<img src="/img/boba-favicon.png" alt="Boba Drops" />
		<span>Boba Drops</span>
	</a>
	<a href="/account" class="avatar" aria-label="account">
		{#if page.data.user?.avatar_url}
			<img src={page.data.user.avatar_url} alt="" />
		{:else}<span class="av-initial">{initial}</span>{/if}
	</a>
</div>

<aside class="rail" aria-label="Main">
	<a href="/home" class="brand" aria-label="Boba Drops home">
		<img src="/img/boba-favicon.png" alt="" />
		<span class="brand-name">Boba Drops</span>
	</a>

	<nav class="nav" aria-label="Primary">
		<ul>
			{#each mainItems as item (item.href)}
				{@const active = isActive(item.href)}
				<li>
					<a href={item.href} class="link" class:active aria-current={active ? 'page' : undefined}>
						<span class="ic"><span class="svg">{@html item.svg}</span></span>
						<span class="label">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>

		{#if staffItems.length}
			<p class="group">staff</p>
			<ul>
				{#each staffItems as item (item.href)}
					{@const active = isActive(item.href)}
					<li>
						<a href={item.href} class="link" class:active aria-current={active ? 'page' : undefined}>
							<span class="ic ic-staff"><span class="svg">{@html item.svg}</span></span>
							<span class="label">{item.label}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>

	<div class="user-card">
		<a href="/account" class="avatar" aria-label="account">
			{#if page.data.user?.avatar_url}
				<img src={page.data.user.avatar_url} alt="" />
			{:else}<span class="av-initial">{initial}</span>{/if}
		</a>
		<div class="u-meta">
			<b>{page.data.user?.nickname ?? page.data.user?.name ?? 'you'}</b>
			{#if page.data.user?.slack_display_name}<span>@{page.data.user.slack_display_name}</span>{/if}
		</div>
		<a href="/logout" class="logout" aria-label="log out" title="log out">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>
		</a>
	</div>
</aside>

<style>
	.rail {
		position: fixed;
		top: 12px;
		bottom: 12px;
		left: 12px;
		width: 236px;
		background: var(--set-2);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		padding: 18px 16px;
		z-index: 20;
		box-shadow: var(--shadow);
		box-sizing: border-box;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 4px 6px;
		margin-bottom: var(--space-l);
		text-decoration: none;
		color: var(--cream);
	}
	.brand img {
		height: 30px;
		width: auto;
		-webkit-user-drag: none;
	}
	.brand-name {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 1.3rem;
		letter-spacing: -0.01em;
	}
	.brand:hover {
		color: var(--cream);
	}

	/* nav sits just under the brand; the user card is pushed to the bottom
	   by margin-top:auto on .user-card, not by centering the nav. */
	.nav {
		display: flex;
		flex-direction: column;
	}
	.nav ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.group {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--set-1-fg2);
		margin: 18px 0 8px 6px;
	}

	.link {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 7px 8px;
		border-radius: 10px;
		text-decoration: none;
		color: var(--set-3-fg2);
		font-size: 1.02rem;
		font-weight: 500;
		transition:
			background 0.14s ease,
			color 0.14s ease;
	}
	.link:hover {
		background: rgba(255, 246, 230, 0.06);
		color: var(--ink);
	}

	/* circular accent-tinted icon wrapper (stardance) */
	.ic {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		flex: none;
		background: var(--taro-soft);
		color: var(--taro);
		transition:
			background 0.14s ease,
			color 0.14s ease;
	}
	.ic-staff {
		background: var(--caramel-soft);
		color: var(--caramel);
	}
	.svg {
		display: flex;
		width: 18px;
		height: 18px;
	}
	.svg :global(svg) {
		width: 100%;
		height: 100%;
	}
	.label {
		white-space: nowrap;
	}

	/* active = filled icon + the label goes editorial (Fraunces italic), the
	   one reserved serif moment per stardance's nav. */
	.link.active {
		color: var(--ink);
	}
	.link.active .ic {
		background: var(--cream);
		color: var(--set-1);
	}
	.link.active .ic-staff {
		background: var(--caramel);
		color: var(--set-1);
	}
	.link.active .label {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 700;
		font-size: 1.12rem;
	}

	.user-card {
		display: flex;
		align-items: center;
		gap: 10px;
		background: var(--set-1);
		border-radius: 10px;
		padding: 9px 11px;
		margin-top: auto;
	}
	.u-meta {
		flex: 1;
		min-width: 0;
		font-size: 0.85rem;
		line-height: 1.3;
	}
	.u-meta b {
		display: block;
		color: var(--ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.u-meta span {
		color: var(--set-1-fg2);
		font-size: 0.76rem;
	}
	.avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--matcha);
		display: grid;
		place-items: center;
		overflow: hidden;
		flex: none;
		text-decoration: none;
	}
	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.av-initial {
		color: var(--set-1);
		font-weight: 800;
		font-size: 0.95rem;
	}
	.logout {
		color: var(--set-1-fg2);
		display: flex;
		flex: none;
	}
	.logout svg {
		width: 18px;
		height: 18px;
	}
	.logout:hover {
		color: var(--berry);
	}

	.mobile-topbar {
		display: none;
	}

	@media (max-width: 767px) {
		.rail {
			top: auto;
			bottom: 0;
			left: 0;
			right: 0;
			width: 100%;
			height: auto;
			flex-direction: row;
			align-items: center;
			border-radius: 0;
			padding: 8px 10px max(8px, env(safe-area-inset-bottom));
			box-shadow: 0 -1px 0 rgba(0, 0, 0, 0.3);
		}
		.brand,
		.group,
		.user-card {
			display: none;
		}
		.nav {
			margin: 0;
			width: 100%;
		}
		.nav ul {
			flex-direction: row;
			justify-content: space-around;
			gap: 0;
		}
		.nav ul:last-child {
			display: none;
		} /* hide staff on mobile bottom bar */
		.link {
			flex-direction: column;
			gap: 3px;
			padding: 4px;
			font-size: 0.62rem;
		}
		.link.active .label {
			font-family: var(--font-body);
			font-style: normal;
			font-weight: 700;
			font-size: 0.62rem;
		}

		.mobile-topbar {
			display: flex;
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			height: 52px;
			background: var(--set-2);
			z-index: 20;
			align-items: center;
			justify-content: space-between;
			padding: 0 16px;
			box-sizing: border-box;
			border-bottom: 1px solid var(--color-line);
		}
		.m-brand {
			display: flex;
			align-items: center;
			gap: 8px;
			text-decoration: none;
			color: var(--cream);
		}
		.m-brand img {
			height: 26px;
		}
		.m-brand span {
			font-family: var(--font-display);
			font-weight: 700;
		}
		.mobile-topbar .avatar {
			width: 32px;
			height: 32px;
		}
	}
</style>
