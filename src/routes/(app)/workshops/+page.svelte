<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let showApply = $state(false);
</script>

<header class="head">
	<p class="eyebrow">workshops</p>
	<h1 class="title">
		{#if data.view === 'leader'}{data.workshop.name}{:else}boba drops workshops{/if}
	</h1>
	<p class="sub">
		{#if data.view === 'leader'}
			share your join code, track your club, and endorse sites you've checked.
		{:else if data.view === 'member'}
			you're part of a workshop — your approved sites send a $5 boba grant to your club leader.
		{:else}
			run Boba Drops for your club and get a grant to buy everyone boba — or join one with a code.
		{/if}
	</p>
</header>

{#if form?.error}
	<p class="form-error">{form.error}</p>
{/if}

<!-- ───────────────── LEADER ───────────────── -->
{#if data.view === 'leader'}
	<section class="code-card set-3">
		<div>
			<p class="small-head">your join code</p>
			<p class="code">{data.workshop.joinCode}</p>
		</div>
		<p class="code-help">members enter this at <strong>workshops → join</strong> to attach their
			sites to your club.</p>
	</section>

	<p class="small-head" style="margin-top: var(--space-l)">
		roster · {data.roster.length}
		{data.roster.length === 1 ? 'member' : 'members'}
	</p>

	{#if data.roster.length === 0}
		<div class="set-3 empty">
			<p>no members yet — share your join code <strong>{data.workshop.joinCode}</strong> to get your
				club started.</p>
		</div>
	{:else}
		<ul class="roster">
			{#each data.roster as m (m.userId)}
				<li class="member set-2">
					<div class="m-head">
						<span class="avatar">
							{#if m.avatar}<img src={m.avatar} alt="" />{:else}{m.name.charAt(0).toUpperCase()}{/if}
						</span>
						<b>{m.name}</b>
						<span class="m-count">{m.approvedCount} approved</span>
					</div>
					{#if m.projects.length === 0}
						<p class="m-empty">hasn't started a site yet.</p>
					{:else}
						<ul class="m-projects">
							{#each m.projects as p (p.id)}
								<li>
									<a class="m-proj" href="/projects/{p.id}">{p.name}</a>
									<span class="status-pill status-pill--{p.status}">
										{p.status === 'pending' ? 'in review' : p.status}
									</span>
									{#if p.endorsed}
										<span class="endorsed-tag">✓ endorsed</span>
									{:else if p.endorsable}
										<form method="POST" action="?/endorse" use:enhance>
											<input type="hidden" name="approval_id" value={p.approvalId} />
											<button type="submit" class="action-btn action-btn--secondary action-btn--small">endorse</button>
										</form>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<!-- ───────────────── MEMBER ───────────────── -->
{:else if data.view === 'member'}
	<section class="set-3 member-card">
		<p class="small-head">your workshop</p>
		<p class="ws-name">{data.membership.workshopName}</p>
		<p class="ws-note">when your site is approved, the $5 boba grant goes to your club leader to
			treat the group. build away on the <a href="/home">home</a> tab.</p>
		<form method="POST" action="?/leave" use:enhance>
			<button type="submit" class="action-btn action-btn--destructive action-btn--small">leave workshop</button>
		</form>
	</section>

	<!-- ───────────────── NONE: apply or join ───────────────── -->
{:else}
	{#if data.pendingApplication}
		<section class="set-4 pending">
			<p class="small-head">application pending</p>
			<p>your request to run <strong>{data.pendingApplication.workshopName}</strong> is with the
				Boba Drops team — we'll be in touch. you can still join another workshop with a code below.</p>
		</section>
	{/if}

	<div class="two-up">
		<section class="set-3 opt">
			<p class="small-head">run a workshop</p>
			<p class="opt-blurb">host Boba Drops at your club. members build sites; each approved one
				earns a $5 grant that comes to you to buy boba for everyone. worldwide.</p>
			{#if form?.applied}
				<p class="ok">✓ application sent — we'll review it soon.</p>
			{:else if showApply}
				<form method="POST" action="?/apply" use:enhance={() => () => { showApply = false; }} class="apply-form">
					<label class="fld">
						<span>workshop name</span>
						<input class="inp" name="workshop_name" required placeholder="Lincoln HS CS Club" />
					</label>
					<label class="fld">
						<span>school / club (optional)</span>
						<input class="inp" name="organization" placeholder="Lincoln High School" />
					</label>
					<label class="fld">
						<span>tell us about it (optional)</span>
						<textarea class="inp" name="details" rows="3" placeholder="when you'll run it, how many members…"></textarea>
					</label>
					<div class="apply-actions">
						<button type="submit" class="action-btn action-btn--primary action-btn--small">submit application</button>
						<button type="button" class="action-btn action-btn--secondary action-btn--small" onclick={() => (showApply = false)}>cancel</button>
					</div>
				</form>
			{:else}
				<button class="action-btn action-btn--primary action-btn--large" onclick={() => (showApply = true)}>
					apply to lead <span class="action-btn__icon action-btn__icon--trailing">→</span>
				</button>
			{/if}
		</section>

		<section class="set-3 opt">
			<p class="small-head">join a workshop</p>
			<p class="opt-blurb">got a code from your club leader? enter it to attach your sites to your
				workshop.</p>
			{#if form?.joined}
				<p class="ok">✓ joined! head to <a href="/home">home</a> to build your site.</p>
			{:else}
				<form method="POST" action="?/join" use:enhance class="join-form">
					<input class="inp code-inp" name="join_code" placeholder="ABC123" maxlength="8" autocomplete="off" />
					<button type="submit" class="action-btn action-btn--primary action-btn--small">join</button>
				</form>
			{/if}
		</section>
	</div>
{/if}

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
		margin: 2px 0 6px;
		color: var(--ink);
	}
	.sub {
		color: var(--set-3-fg2);
		font-size: 1.05rem;
		margin: 0;
		max-width: 62ch;
	}
	.form-error {
		background: var(--berry-soft);
		color: var(--berry);
		border-radius: var(--radius);
		padding: 10px 14px;
		font-size: 0.92rem;
		margin: 0 0 var(--space-m);
	}
	.ok {
		color: var(--matcha);
		font-weight: 600;
		margin: 0;
	}

	/* leader */
	.code-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-l);
		padding: var(--space-l);
		flex-wrap: wrap;
	}
	.code {
		font-family: var(--font-display);
		font-size: 2.6rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: var(--cream);
		margin: 4px 0 0;
	}
	.code-help {
		color: var(--set-3-fg2);
		font-size: 0.92rem;
		margin: 0;
		max-width: 28ch;
	}

	.roster {
		list-style: none;
		margin: var(--space-s) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.member {
		padding: 14px 16px;
		border-radius: var(--radius);
	}
	.m-head {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.m-head b {
		font-size: 1rem;
		color: var(--ink);
	}
	.m-count {
		margin-left: auto;
		font-size: 0.8rem;
		color: var(--set-1-fg2);
	}
	.avatar {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: var(--taro);
		color: var(--set-1);
		display: grid;
		place-items: center;
		font-weight: 800;
		font-size: 0.85rem;
		overflow: hidden;
		flex: none;
	}
	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.m-empty {
		color: var(--set-1-fg2);
		font-size: 0.88rem;
		margin: 10px 0 0 40px;
	}
	.m-projects {
		list-style: none;
		margin: 10px 0 0 40px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.m-projects li {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.m-projects form {
		display: contents;
	}
	.m-proj {
		color: var(--ink);
		text-decoration: none;
		font-size: 0.92rem;
	}
	.m-proj:hover {
		color: var(--cream);
	}
	.endorsed-tag {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--matcha);
	}

	.empty,
	.pending,
	.member-card {
		padding: var(--space-l);
	}
	.empty p {
		margin: 0;
		color: var(--set-3-fg2);
	}

	.member-card .ws-name {
		font-family: var(--font-display);
		font-size: 1.6rem;
		color: var(--cream);
		margin: 0 0 8px;
	}
	.ws-note {
		color: var(--set-3-fg2);
		margin: 0 0 var(--space-m);
		max-width: 52ch;
	}

	.pending {
		margin-bottom: var(--space-l);
	}
	.pending p {
		margin: 0;
		color: var(--ink);
	}

	.two-up {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-l);
	}
	@media (max-width: 760px) {
		.two-up {
			grid-template-columns: 1fr;
		}
	}
	.opt {
		padding: var(--space-l);
	}
	.opt-blurb {
		color: var(--set-3-fg2);
		font-size: 0.95rem;
		margin: 0 0 var(--space-m);
	}

	.apply-form,
	.join-form {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.join-form {
		flex-direction: row;
	}
	.fld {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.82rem;
		color: var(--set-3-fg2);
	}
	.inp {
		font-family: var(--font-body);
		background: var(--set-1);
		color: var(--ink);
		border: 2px solid var(--set-2-fg2);
		border-radius: var(--radius);
		padding: 9px 12px;
		font-size: 0.95rem;
	}
	.inp:focus {
		outline: none;
		border-color: var(--cream);
	}
	.code-inp {
		flex: 1;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-weight: 700;
	}
	.apply-actions {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}
</style>
