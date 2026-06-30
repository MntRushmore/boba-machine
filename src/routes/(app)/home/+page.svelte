<script lang="ts">
	let { data } = $props();

	const name = $derived(data.user?.nickname ?? data.user?.name ?? 'there');
	const communityDollars = $derived((data.communityGrantCents / 100).toLocaleString('en-US'));
	const cupPct = $derived(Math.min(100, Math.round((data.communitySites / 500) * 100)));

	const isVerified = $derived(data.user?.verification_status === 'verified');
	const hasSites = $derived(data.mySites.length > 0);

	// The one-time path everyone walks once: build → publish → submit → boba.
	// Figure out which step they're on so we can spotlight the next action.
	const builtOrSubmitted = $derived(hasSites);
	const submitted = $derived(data.approvedCount > 0 || data.inReviewCount > 0);
	const approved = $derived(data.approvedCount > 0);

	const steps = $derived([
		{
			key: 'build',
			n: 1,
			title: 'Build your site',
			blurb: 'a personal website with HTML & CSS — start it in the editor.',
			done: builtOrSubmitted
		},
		{
			key: 'publish',
			n: 2,
			title: 'Publish to GitHub Pages',
			blurb: 'one click puts it online at your own github.io address.',
			done: builtOrSubmitted
		},
		{
			key: 'submit',
			n: 3,
			title: 'Submit it for review',
			blurb: 'pick your track — individual or with a workshop.',
			done: submitted
		},
		{
			key: 'boba',
			n: 4,
			title: 'Get your boba',
			blurb: 'approved sites earn a $5 grant. cheers!',
			done: approved
		}
	]);

	// First not-done step = the current one to spotlight.
	const currentStep = $derived(steps.find((s) => !s.done) ?? steps[steps.length - 1]);

	const accentForIndex = ['var(--matcha)', 'var(--taro)', 'var(--berry)', 'var(--sky)'];
</script>

<header class="head">
	<h1 class="title">welcome, {name}</h1>
	<p class="sub">your path to free boba — build a site, ship it, get $5. here's the whole thing.</p>
</header>

{#if !isVerified}
	<a
		class="verify"
		href="https://auth.hackclub.com/verifications/new"
		target="_blank"
		rel="noreferrer"
	>
		<span class="verify-dot"></span>
		verify your identity so we can send your boba →
	</a>
{/if}

<!-- the journey: the hero of the page -->
<section class="path set-3" aria-label="Your path to boba">
	<ol class="steps">
		{#each steps as step (step.key)}
			<li class="step" class:done={step.done} class:current={step.key === currentStep.key}>
				<span class="step-mark">
					{#if step.done}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 6.5" /></svg>
					{:else}{step.n}{/if}
				</span>
				<span class="step-body">
					<b>{step.title}</b>
					<span>{step.blurb}</span>
				</span>
			</li>
		{/each}
	</ol>

	<div class="path-cta">
		{#if !approved}
			<a class="action-btn action-btn--primary action-btn--large" href="/projects?new=1">
				{currentStep.key === 'build' ? 'Start your site' : 'Continue your site'}
				<span class="action-btn__icon action-btn__icon--trailing">→</span>
			</a>
			<a class="path-secondary" href="/guides">read the build guide</a>
		{:else}
			<a class="action-btn action-btn--primary action-btn--large" href="/projects?new=1">
				Build another site
				<span class="action-btn__icon action-btn__icon--trailing">→</span>
			</a>
			<span class="path-secondary">🧋 you've earned boba — nice work.</span>
		{/if}
	</div>
</section>

<!-- your sites — only meaningful once they exist -->
{#if hasSites}
	<section class="sites-section">
		<div class="col-head">
			<p class="small-head" style="margin: 0">your sites</p>
			<a class="action-btn action-btn--secondary action-btn--small" href="/projects?new=1">+ new site</a>
		</div>
		<ul class="sites">
			{#each data.mySites as s, i (s.id)}
				<li>
					<a class="site bordered" href="/projects/{s.id}">
						<span class="thumb" style="background-color: {accentForIndex[i % 4]}">
							{#if s.screenshotUrl}<img src={s.screenshotUrl} alt="" />{/if}
						</span>
						<span class="site-meta">
							<b>{s.name}</b>
							<span>{s.demoUrl ?? 'not published yet'}</span>
						</span>
						<span class="status-pill status-pill--{s.status}">
							{s.status === 'pending' ? 'in review' : s.status}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<!-- community cup: the one communal flourish, a slim strip -->
<section class="community set-3" aria-label="Community progress">
	<svg class="cup" viewBox="0 0 120 150" aria-hidden="true">
		<defs><clipPath id="cc"><path d="M22 44h76l-7 92a8 8 0 0 1-8 7H37a8 8 0 0 1-8-7L22 44z" /></clipPath></defs>
		<g clip-path="url(#cc)">
			<rect x="0" y="0" width="120" height="150" fill="var(--set-2)" />
			<rect x="0" y={150 - cupPct * 1.06} width="120" height="160" fill="#c2873f" />
			<circle cx="40" cy="138" r="6" fill="var(--pearl)" /><circle cx="56" cy="142" r="6" fill="var(--pearl)" /><circle cx="72" cy="138" r="6" fill="var(--pearl)" /><circle cx="50" cy="132" r="5" fill="var(--pearl)" /><circle cx="66" cy="131" r="5" fill="var(--pearl)" />
		</g>
		<path d="M22 44h76l-7 92a8 8 0 0 1-8 7H37a8 8 0 0 1-8-7L22 44z" fill="none" stroke="var(--cream)" stroke-width="3" />
		<rect x="16" y="36" width="88" height="12" rx="4" fill="var(--cream)" />
		<rect x="64" y="8" width="9" height="40" rx="3" fill="var(--matcha)" transform="rotate(10 68 28)" />
	</svg>
	<div class="community-text">
		<p class="small-head" style="margin: 0 0 4px">the community cup</p>
		<p class="community-meta">
			builders have shipped <b>{data.communitySites}</b>
			{data.communitySites === 1 ? 'site' : 'sites'} and poured <b>${communityDollars}</b> of boba so far.
		</p>
	</div>
</section>

<style>
	.head {
		margin-bottom: var(--space-l);
	}
	.title {
		font-family: var(--font-display);
		font-style: italic;
		font-weight: 700;
		font-size: clamp(2rem, 4vw, 2.8rem);
		line-height: 1.05;
		margin: 0 0 6px;
		color: var(--ink);
	}
	.sub {
		color: var(--set-3-fg2);
		font-size: 1.05rem;
		margin: 0;
		max-width: 60ch;
	}

	.verify {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		background: var(--caramel-soft);
		color: var(--caramel);
		border: 1px solid color-mix(in srgb, var(--caramel) 30%, transparent);
		border-radius: 999px;
		padding: 9px 16px;
		font-size: 0.92rem;
		font-weight: 600;
		text-decoration: none;
		margin-bottom: var(--space-l);
	}
	.verify:hover {
		color: var(--caramel);
		border-color: var(--caramel);
	}
	.verify-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--caramel);
		flex: none;
	}

	/* ── the path (hero) ── */
	.path {
		padding: var(--space-l);
		margin-bottom: var(--space-l);
	}
	.steps {
		list-style: none;
		margin: 0 0 var(--space-l);
		padding: 0;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-m);
	}
	@media (max-width: 880px) {
		.steps {
			grid-template-columns: 1fr 1fr;
		}
	}
	@media (max-width: 520px) {
		.steps {
			grid-template-columns: 1fr;
		}
	}
	.step {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		padding: 14px;
		border-radius: var(--radius);
		background: var(--set-2);
		border: 2px solid transparent;
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	.step.current {
		border-color: var(--cream);
		background: color-mix(in srgb, var(--cream) 8%, var(--set-2));
	}
	.step-mark {
		flex: none;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-weight: 800;
		font-size: 0.95rem;
		font-variant-numeric: tabular-nums;
		background: rgba(255, 246, 230, 0.08);
		color: var(--set-1-fg2);
	}
	.step-mark svg {
		width: 16px;
		height: 16px;
	}
	.step.done .step-mark {
		background: var(--matcha);
		color: var(--set-1);
	}
	.step.current .step-mark {
		background: var(--cream);
		color: var(--set-1);
	}
	.step-body b {
		display: block;
		font-size: 0.98rem;
		color: var(--ink);
		margin-bottom: 2px;
	}
	.step-body span {
		font-size: 0.84rem;
		color: var(--set-3-fg2);
		line-height: 1.4;
	}
	.step.done .step-body b {
		color: var(--set-3-fg2);
	}

	.path-cta {
		display: flex;
		align-items: center;
		gap: var(--space-l);
		flex-wrap: wrap;
		padding-top: var(--space-m);
		border-top: 1px solid var(--color-line);
	}
	.path-secondary {
		color: var(--set-3-fg2);
		font-size: 0.92rem;
		text-decoration: none;
	}
	a.path-secondary:hover {
		color: var(--cream);
	}

	/* ── your sites ── */
	.sites-section {
		margin-bottom: var(--space-l);
	}
	.col-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-s);
	}
	.sites {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.site {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 14px;
		text-decoration: none;
		color: var(--ink);
	}
	.thumb {
		width: 60px;
		height: 44px;
		border-radius: 6px;
		flex: none;
		overflow: hidden;
		display: block;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.site-meta {
		flex: 1;
		min-width: 0;
	}
	.site-meta b {
		display: block;
		font-size: 1rem;
	}
	.site-meta span {
		color: var(--set-1-fg2);
		font-size: 0.82rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: block;
	}

	/* ── community cup strip ── */
	.community {
		display: flex;
		align-items: center;
		gap: var(--space-l);
		padding: var(--space-m) var(--space-l);
	}
	.community .cup {
		width: 52px;
		height: 65px;
		flex: none;
	}
	.community-meta {
		margin: 0;
		color: var(--set-3-fg2);
		font-size: 0.96rem;
	}
	.community-meta b {
		color: var(--ink);
		font-family: var(--font-display);
	}
</style>
