<script lang="ts">
	const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
	const months = [
		'january',
		'february',
		'march',
		'april',
		'may',
		'june',
		'july',
		'august',
		'september',
		'october',
		'november',
		'december'
	];

	const now = new Date();
	const dateLabel = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;

	const communityGoalHours = 2000;
	let communityHours = $state(760);
	const communityProgress = $derived((communityHours / communityGoalHours) * 100);
	const goals = [
		{ pct: 5, label: "decide max's pfp", hours: '100 hours' },
		{ pct: 12.5, label: 'i want to cheese', hours: '250 hours' },
		{ pct: 25, label: "dye max's hair", hours: '500 hours' },
		{ pct: 37.5, label: "bleach [redacted]'s hair", hours: '750 hours' },
		{ pct: 50, label: "dye jenin's hair", hours: '1000 hours' },
		{ pct: 75, label: 'tiktok dance', hours: '1500 hours' },
		{ pct: 100, label: 'catmaid for a day', hours: '2000 hours' }
	];

	const slack = 12;
	const allCompleted = $derived(communityProgress >= 100);
	const prevGoal = $derived(
		goals.findLast((g) => g.pct <= communityProgress) ?? {
			pct: 0,
			label: 'start',
			hours: '0 hours'
		}
	);
	const nextGoal = $derived(
		goals.find((g) => g.pct > communityProgress) ?? goals[goals.length - 1]
	);
	const fillStart = $derived(prevGoal.pct > 0 ? slack : 0);
	const fillEnd = $derived(
		allCompleted
			? 100 - slack
			: fillStart +
					((communityProgress - prevGoal.pct) / (nextGoal.pct - prevGoal.pct)) *
						(100 - slack - fillStart)
	);

	const quests = [
		{ label: '[among us]', pct: 40 },
		{ label: '[sussy baka]', pct: 0 },
		{ label: '[hello its me crewmate i am the good guy on the spaceship]', pct: 75 }
	];
</script>

<svelte:head>
	<title>onekey - home</title>
</svelte:head>

<p class="eyebrow">{dateLabel}</p>
<h1 class="greeting">welcome back, [name]</h1>

<div class="bento">
	<div class="card card-hero">
		<img class="hero-bg" src="/img/frame1.png" alt="" aria-hidden="true" />
		<span class="card-hero-label">configure your onekey!</span>
		<a href="/onekey" class="hero-btn">
			go
			<svg
				fill-rule="evenodd"
				clip-rule="evenodd"
				stroke-linejoin="round"
				stroke-miterlimit="1.414"
				xmlns="http://www.w3.org/2000/svg"
				aria-label="right-caret"
				viewBox="0 0 32 32"
				preserveAspectRatio="xMidYMid meet"
				fill="currentColor"
				width="1em"
				height="1em"
				><path
					d="M11.6068 8.1099C11.2532 8.53417 11.3106 9.16473 11.7348 9.51829C13.3799 10.8952 17.2004 14.2798 18.5095 16.0001C17.1784 17.7493 13.4095 21.0851 11.7348 22.4819C11.3106 22.8355 11.2532 23.466 11.6068 23.8903C11.9604 24.3146 12.5913 24.3716 13.0156 24.018C14.8552 22.4864 18.8153 19.025 20.2164 17.0536C20.4346 16.7423 20.625 16.3902 20.625 16.0001C20.625 15.6099 20.4346 15.2578 20.2164 14.9466C18.8435 13.0149 14.8171 9.4852 13.0165 7.98291L13.0152 7.98186C12.5909 7.6283 11.9604 7.68562 11.6068 8.1099Z"
				/></svg
			>
		</a>
	</div>

	<div class="card">
		<span class="card-label">[section]</span>
	</div>
	<div class="card">
		<span class="card-label">[section]</span>
	</div>

	<div class="card card-full goals-combined">
		<div class="goals-bar-section">
			<div class="card-label-row">
				<span class="card-label">community goals</span>
			</div>
			{#if allCompleted}
				<p class="goals-complete">all goals complete! 🎉</p>
			{:else}
				<div class="goal-bar">
					<div class="goal-bar-inner">
						<div class="goal-track">
							{#if communityHours > 0}
								<div class="goal-fill" style="width: {fillEnd}%"></div>
							{/if}
						</div>
						{#if prevGoal.pct > 0}
							<div class="goal-marker reached" style="left: {slack}%">
								<span class="goal-marker-top">{prevGoal.hours}</span>
								<div class="goal-dot reached"></div>
								<span class="goal-marker-label">{prevGoal.label}</span>
							</div>
						{/if}
						<div class="goal-marker" style="left: {100 - slack}%">
							<span class="goal-marker-top">{nextGoal.hours}</span>
							<div class="goal-dot"></div>
							<span class="goal-marker-label">{nextGoal.label}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>
		<div class="goals-milestones-section">
			<span class="card-label">{communityHours} / {communityGoalHours} hours</span>
			<ul class="milestone-list">
				{#each goals as g (g.pct)}
					<li class="milestone-row" class:reached={g.pct <= communityProgress}>
						<span class="milestone-dot"></span>
						<span class="milestone-label">{g.label}</span>
						<span class="milestone-hours">{g.hours}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>

	<!-- <div class="card">
		<span class="card-label">[section]</span>
	</div>

	<div class="card">
		<span class="card-label">[section]</span>
	</div>

	<div class="card card-wide">
		<span class="card-label">[section]</span>
	</div>

	<div class="card card-sm">
		<span class="card-label">[section]</span>
	</div> -->
</div>

<style>
	.eyebrow {
		font-size: 1.05rem;
		font-weight: 500;
		color: var(--rail-label);
		margin: 0 0;
	}

	.greeting {
		font-size: clamp(2.5rem, 3.5vw, 3.5rem);
		font-weight: bold;
		letter-spacing: -0.03em;
		line-height: 1;
		margin: 0 0 2.5rem;
	}

	.bento {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: clamp(0.75rem, 1.2vw, 1.75rem);
	}

	.card {
		background: var(--color-bg);
		border-radius: var(--radius-card);
		border: solid var(--border-width);
		padding: clamp(1rem, 1.5vw, 1.75rem) clamp(1.1rem, 1.5vw, 1.75rem);
		min-height: clamp(8rem, 12vh, 16rem);
		box-sizing: border-box;
	}

	.card.quests {
		grid-column: span 2;
		min-height: clamp(11rem, 16vh, 22rem);
	}

	/* .card.card-wide { grid-column: span 2; }
	.card.card-sm { min-height: clamp(4rem, 6vh, 8rem); } */

	.card.card-full {
		grid-column: span 3;
	}

	.card.card-hero {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		gap: 1rem;
		padding-top: clamp(1.5rem, 2.5vw, 3rem);
		padding-bottom: clamp(1.5rem, 2.5vw, 3rem);
		overflow: hidden;
	}

	.hero-bg {
		position: absolute;
		right: -25%;
		top: 62.5%;
		transform: translateY(-50%) scaleX(-1);
		height: 120%;
		aspect-ratio: 35 / 30;
		object-fit: fill;
		opacity: 0.55;
		filter: blur(3.5px);
		z-index: 0;
		pointer-events: none;
		user-select: none;
	}

	.card-hero-label,
	.hero-btn {
		position: relative;
		z-index: 1;
	}

	.card-hero-label {
		font-size: clamp(2.2rem, 4.2vw, 5.5rem);
		font-weight: bold;
		letter-spacing: -0.04em;
		line-height: 0.92;
	}

	.hero-btn {
		align-self: flex-start;
		display: flex;
		align-items: center;
		gap: 0.15em;
		text-decoration: none;
		background: black;
		color: white;
		font-weight: bold;
		border: none;
		border-radius: var(--radius-pill);
		padding: 0.76rem 1.2rem 0.76rem 1.7rem;
		font-size: clamp(1.2rem, 1.6vw, 1.8rem);
	}

	.hero-btn svg {
		transition: transform var(--transition-fast);
	}

	.hero-btn:hover svg {
		transform: translateX(0.1em);
	}

	.goals-combined {
		display: flex;
		gap: clamp(1rem, 2vw, 2rem);
		min-height: clamp(11rem, 16vh, 22rem);
	}

	.goals-bar-section {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.goals-milestones-section {
		width: clamp(12rem, 30%, 22rem);
		flex-shrink: 0;
		position: relative;
		padding-left: clamp(1rem, 2vw, 2rem);
	}

	.goals-milestones-section::before {
		content: '';
		position: absolute;
		left: 0;
		top: calc(-1 * clamp(1rem, 1.5vw, 1.75rem));
		bottom: calc(-1 * clamp(1rem, 1.5vw, 1.75rem));
		width: 0.15rem;
		background: rgba(0, 0, 0, 0.15);
		border-radius: 9999px;
	}

	.goals-milestones-section .card-label {
		text-align: center;
	}

	.card-label-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.card-label {
		display: block;
		font-size: clamp(0.8rem, 0.9vw, 1.1rem);
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: var(--color-text-soft);
		margin-bottom: 1.25rem;
		font-weight: bold;
	}

	.goal-bar {
		padding: 2.5rem 1rem 3rem;
	}

	.goal-bar-inner {
		position: relative;
	}

	.goal-track {
		height: 2.5rem;
		background: rgba(0, 0, 0, 0.12);
		border-radius: 9999px;
		overflow: hidden;
	}

	.goal-fill {
		position: relative;
		height: 100%;
		background: var(--color-text);
		transition: width 0.35s ease;
	}

	.goals-complete {
		font-size: clamp(2.5rem, 4vw, 5rem);
		font-weight: bold;
		letter-spacing: -0.02em;
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
	}

	.goal-fill::after {
		content: '';
		position: absolute;
		right: -1.25rem;
		top: 0;
		width: 2.5rem;
		height: 2.5rem;
		background: var(--color-text);
		border-radius: 50%;
	}

	.goal-marker {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.goal-dot {
		width: 3.7rem;
		height: 3.7rem;
		border-radius: 50%;
		border: 0.35rem solid var(--color-bg);
		background: #e0e0e0;
		flex-shrink: 0;
	}

	.goal-dot.reached {
		background: var(--color-text);
	}

	.goal-marker.reached .goal-marker-top,
	.goal-marker.reached .goal-marker-label {
		color: var(--color-text);
	}

	.goal-marker-top {
		position: absolute;
		bottom: calc(100% + 0.4rem);
		font-size: 0.6rem;
		font-weight: bold;
		letter-spacing: 0.1em;
		color: var(--rail-label);
		white-space: nowrap;
		text-transform: uppercase;
	}

	.goal-marker-label {
		font-weight: bold;
		position: absolute;
		top: calc(100% + 0.4rem);
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: var(--rail-label);
		white-space: nowrap;
		text-transform: uppercase;
	}

	.milestone-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.milestone-row {
		display: grid;
		grid-template-columns: 0.6rem 1fr auto;
		align-items: center;
		gap: 0.6rem;
		color: var(--rail-label);
	}

	.milestone-row.reached {
		color: var(--color-text);
	}

	.milestone-dot {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		border: 1.5px solid currentColor;
		flex-shrink: 0;
	}

	.milestone-row.reached .milestone-dot {
		background: currentColor;
	}

	.milestone-label {
		font-size: 0.75rem;
		font-weight: bold;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.milestone-hours {
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		white-space: nowrap;
	}

	.quest-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.quest-row {
		display: grid;
		grid-template-columns: 1rem 1fr 5rem;
		align-items: center;
		gap: 0.75rem;
	}

	.quest-dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 50%;
		border: 1.5px solid var(--rail-label);
	}

	.quest-name {
		font-size: 0.875rem;
		color: var(--color-text-soft);
	}

	.quest-track {
		height: 2px;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 9999px;
		overflow: hidden;
	}

	.quest-fill {
		height: 100%;
		background: var(--color-text);
		border-radius: 9999px;
	}

</style>
