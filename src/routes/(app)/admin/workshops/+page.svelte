<script lang="ts">
	import { enhance } from '$app/forms';
	let { data } = $props();

	function leaderName(w: { leaderSlack: string | null; leaderNick: string | null; leaderName: string | null }) {
		return w.leaderSlack || w.leaderNick || w.leaderName || 'leader';
	}
	function applicant(a: {
		applicantSlack: string | null;
		applicantNick: string | null;
		applicantName: string | null;
		applicantEmail: string | null;
	}) {
		return a.applicantSlack || a.applicantNick || a.applicantName || a.applicantEmail || 'someone';
	}
	const pending = $derived(data.applications.filter((a) => a.pending));
	const decided = $derived(data.applications.filter((a) => !a.pending));
</script>

<div class="page">
	<div class="head">
		<a href="/admin" class="back">← admin</a>
		<h1>workshops</h1>
		<p class="sub">approve workshop applications and see active clubs.</p>
	</div>

	<p class="small-head">applications {#if pending.length}· {pending.length} pending{/if}</p>
	{#if pending.length === 0}
		<p class="muted">no pending applications.</p>
	{:else}
		<ul class="apps">
			{#each pending as a (a.id)}
				<li class="app set-2 manageable">
					<div class="app-top">
						<div>
							<b>{a.workshopName}</b>
							<span class="app-meta">{applicant(a)}{#if a.organization} · {a.organization}{/if}</span>
						</div>
						<span class="admin-pill">pending</span>
					</div>
					{#if a.details}<p class="app-details">{a.details}</p>{/if}
					<div class="app-actions">
						<form method="POST" action="?/approve" use:enhance>
							<input type="hidden" name="application_id" value={a.id} />
							<button type="submit" class="action-btn action-btn--primary action-btn--small">approve &amp; create workshop</button>
						</form>
						<form method="POST" action="?/reject" use:enhance>
							<input type="hidden" name="application_id" value={a.id} />
							<button type="submit" class="action-btn action-btn--destructive action-btn--small">reject</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="small-head" style="margin-top: var(--space-xl)">active workshops · {data.workshops.length}</p>
	{#if data.workshops.length === 0}
		<p class="muted">no workshops yet.</p>
	{:else}
		<div class="tablewrap">
			<table>
				<thead>
					<tr><th>workshop</th><th>leader</th><th>code</th><th>members</th><th>status</th></tr>
				</thead>
				<tbody>
					{#each data.workshops as w (w.id)}
						<tr>
							<td class="td-name">{w.name}{#if w.organization}<span class="org"> · {w.organization}</span>{/if}</td>
							<td>{leaderName(w)}</td>
							<td class="code">{w.joinCode}</td>
							<td>{w.members}</td>
							<td><span class="status-pill status-pill--{w.status === 'active' ? 'approved' : 'draft'}">{w.status}</span></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if decided.length}
		<p class="small-head" style="margin-top: var(--space-xl)">past applications</p>
		<ul class="past">
			{#each decided as a (a.id)}
				<li>
					<span class="status-pill status-pill--{a.status === 'approved' ? 'approved' : 'rejected'}">{a.status}</span>
					<b>{a.workshopName}</b> — {applicant(a)}
					{#if a.reviewerNote}<span class="note">“{a.reviewerNote}”</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-s);
	}
	.back {
		font-size: 0.85rem;
		text-decoration: none;
		opacity: 0.75;
	}
	.head h1 {
		font-size: clamp(1.6rem, 3vw, 2.4rem);
		margin: 0.3rem 0 0.25rem;
	}
	.sub {
		color: var(--color-text-soft);
		opacity: 0.85;
		margin: 0 0 var(--space-m);
	}
	.muted {
		color: var(--set-1-fg2);
	}

	.apps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.app {
		border-radius: var(--radius);
		padding: 16px 18px;
	}
	.app-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.app-top b {
		color: var(--ink);
		font-size: 1.05rem;
	}
	.app-meta {
		display: block;
		color: var(--set-1-fg2);
		font-size: 0.85rem;
		margin-top: 2px;
	}
	.app-details {
		color: var(--set-3-fg2);
		font-size: 0.92rem;
		margin: 10px 0;
	}
	.app-actions {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}
	.app-actions form {
		display: contents;
	}

	.tablewrap {
		overflow-x: auto;
		border-radius: var(--radius);
		border: 2px solid var(--set-2-fg2);
	}
	table {
		border-collapse: collapse;
		width: 100%;
		min-width: 560px;
		font-size: 0.92rem;
		background: var(--set-2);
	}
	th,
	td {
		text-align: left;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid var(--color-line);
	}
	th {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--set-1-fg2);
	}
	tr:last-child td {
		border-bottom: none;
	}
	.td-name {
		font-weight: 600;
		color: var(--ink);
	}
	.org {
		font-weight: 400;
		color: var(--set-1-fg2);
	}
	.code {
		font-weight: 700;
		letter-spacing: 0.08em;
		color: var(--cream);
	}

	.past {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.past li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		color: var(--set-3-fg2);
	}
	.past b {
		color: var(--ink);
	}
	.note {
		opacity: 0.7;
		font-style: italic;
	}
</style>
