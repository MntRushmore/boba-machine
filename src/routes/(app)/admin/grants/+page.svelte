<script lang="ts">
	import { enhance } from '$app/forms';
	let { data } = $props();

	function money(cents: number, currency: string) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
	}
	function fmtDate(d: string | Date | null) {
		return d ? new Date(d).toLocaleDateString() : '—';
	}
</script>

<div class="page">
	<div class="head">
		<a href="/admin" class="back">← admin</a>
		<h1>boba grants</h1>
		<p class="sub">$5 grants from approved sites. mark each one paid once you've sent it.</p>
	</div>

	<div class="stats">
		<div class="stat">
			<span class="stat-num">{data.counts.pending}</span>
			<span class="stat-label">pending</span>
		</div>
		<div class="stat">
			<span class="stat-num">{money(data.counts.pendingCents, 'USD')}</span>
			<span class="stat-label">owed</span>
		</div>
		<div class="stat">
			<span class="stat-num">{data.counts.sent}</span>
			<span class="stat-label">sent</span>
		</div>
		<div class="stat">
			<span class="stat-num">{data.counts.total}</span>
			<span class="stat-label">total</span>
		</div>
	</div>

	{#if data.grants.length === 0}
		<p class="empty">no grants yet — they appear here when a site is approved.</p>
	{:else}
		<div class="tablewrap">
			<table>
				<thead>
					<tr>
						<th>site</th>
						<th>recipient</th>
						<th>track</th>
						<th>pays</th>
						<th>amount</th>
						<th>status</th>
						<th>actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.grants as g (g.id)}
						<tr class:is-pending={g.status === 'pending'}>
							<td class="td-site">
								<a href="/projects/{g.projectId}">{g.projectName}</a>
								<span class="proj-id">#{g.projectId}</span>
							</td>
							<td>
								<div class="recip">{g.userSlack ?? g.userNickname ?? g.recipientName ?? '—'}</div>
								{#if g.recipientEmail}<div class="recip-sub">{g.recipientEmail}</div>{/if}
								{#if g.recipientCountry}<div class="recip-sub">{g.recipientCountry}</div>{/if}
							</td>
							<td>{g.submissionType}</td>
							<td>
								<span class="pill pill-{g.payoutTarget}"
									>{g.payoutTarget === 'leader' ? 'club leader' : 'the teen'}</span
								>
							</td>
							<td class="td-amount">{money(g.amountCents, g.currency)}</td>
							<td><span class="status status-{g.status}">{g.status}</span></td>
							<td class="td-actions">
								{#if g.status === 'pending'}
									<form method="POST" action="?/markSent" use:enhance>
										<input type="hidden" name="grant_id" value={g.id} />
										<button type="submit" class="btn btn-pay">mark paid</button>
									</form>
									<form method="POST" action="?/void" use:enhance>
										<input type="hidden" name="grant_id" value={g.id} />
										<button type="submit" class="btn btn-void">void</button>
									</form>
								{:else if g.status === 'sent'}
									<span class="sent-at">paid {fmtDate(g.sentAt)}</span>
									<form method="POST" action="?/markPending" use:enhance>
										<input type="hidden" name="grant_id" value={g.id} />
										<button type="submit" class="btn btn-undo">undo</button>
									</form>
								{:else}
									<form method="POST" action="?/markPending" use:enhance>
										<input type="hidden" name="grant_id" value={g.id} />
										<button type="submit" class="btn btn-undo">reopen</button>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
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
		font-size: 0.95rem;
		color: var(--color-text-soft);
		opacity: 0.85;
		margin: 0;
	}

	.stats {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.stat {
		background: var(--color-surface);
		border-radius: var(--radius-card);
		padding: 1rem 1.4rem;
		box-shadow: var(--shadow-stack);
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 7rem;
	}
	.stat-num {
		font-family: var(--font-display);
		font-size: 1.8rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--cream);
	}
	.stat-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		opacity: 0.7;
	}

	.empty {
		color: var(--color-text-soft);
		opacity: 0.8;
	}

	.tablewrap {
		overflow-x: auto;
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-stack);
	}
	table {
		border-collapse: collapse;
		width: 100%;
		min-width: 720px;
		font-size: 0.92rem;
		background: var(--color-surface);
	}
	th,
	td {
		text-align: left;
		padding: 0.8rem 1rem;
		border-bottom: 1px solid var(--color-line);
		vertical-align: top;
	}
	th {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		opacity: 0.7;
	}
	tr:last-child td {
		border-bottom: none;
	}
	tr.is-pending {
		background: color-mix(in srgb, var(--cream) 6%, transparent);
	}
	.td-site a {
		text-decoration: none;
		font-weight: 600;
	}
	.proj-id {
		opacity: 0.5;
		font-size: 0.8rem;
		margin-left: 0.3rem;
	}
	.recip-sub {
		font-size: 0.78rem;
		opacity: 0.65;
	}
	.td-amount {
		font-variant-numeric: tabular-nums;
		font-weight: 700;
	}

	.pill {
		display: inline-block;
		font-size: 0.72rem;
		font-weight: 700;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		background: var(--espresso-deep);
		color: var(--cream);
	}
	.pill-leader {
		background: color-mix(in srgb, var(--caramel) 80%, black);
	}

	.status {
		display: inline-block;
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
	}
	.status-pending {
		background: color-mix(in srgb, var(--warn) 22%, transparent);
		color: var(--warn);
	}
	.status-sent {
		background: color-mix(in srgb, var(--good-soft) 22%, transparent);
		color: var(--good-soft);
	}
	.status-void {
		background: color-mix(in srgb, var(--bad) 22%, transparent);
		color: var(--bad);
	}

	.td-actions {
		display: flex;
		gap: 0.4rem;
		align-items: center;
		flex-wrap: wrap;
	}
	.td-actions form {
		display: contents;
	}
	.btn {
		font-family: var(--font-body);
		font-size: 0.78rem;
		font-weight: 700;
		padding: 0.35rem 0.8rem;
		border-radius: 999px;
		border: none;
		cursor: pointer;
	}
	.btn-pay {
		background: var(--cream);
		color: var(--espresso);
		box-shadow: var(--shadow-stack);
	}
	.btn-void {
		background: transparent;
		color: var(--bad);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bad) 50%, transparent);
	}
	.btn-undo {
		background: transparent;
		color: var(--cream-soft);
		box-shadow: inset 0 0 0 1px var(--color-line);
	}
	.sent-at {
		font-size: 0.78rem;
		opacity: 0.7;
	}
</style>
