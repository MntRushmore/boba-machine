<script lang="ts">
	import { formatHours } from '$lib/format';
	let { data } = $props();

	const STATUS_ORDER = ['pending', 'soft_approved', 'approved', 'rejected'];

	const statusLabel = (s: string) => s.replace('_', ' ');

	const fmtDate = (d: Date | string | null) => {
		if (!d) return '—';
		return new Date(d).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	};

	const orderedCounts = $derived(
		[
			...STATUS_ORDER.filter((s) => s in data.counts),
			...Object.keys(data.counts).filter((s) => !STATUS_ORDER.includes(s))
		].map((s) => ({ status: s, n: data.counts[s] }))
	);
</script>

<div class="admin-ships">
	<div class="header">
		<a href="/admin" class="back">← admin</a>
		<h1>ships</h1>
		<p class="sub">
			every submission ever sent for review — a project can have several. Each row is one ship,
			tagged with its verdict and linked to its project.
		</p>
	</div>

	<div class="summary">
		<span class="summary-total">{data.total} ships</span>
		{#each orderedCounts as c (c.status)}
			<span class="badge badge-{c.status}">{c.n} {statusLabel(c.status)}</span>
		{/each}
	</div>

	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th>project</th>
					<th>submitted by</th>
					<th>verdict</th>
					<th>track</th>
					<th>submitted</th>
					<th>reviewed</th>
					<th>reviewer</th>
				</tr>
			</thead>
			<tbody>
				{#each data.ships as ship (ship.id)}
					<tr>
						<td class="td-project">
							<a href="/projects/{ship.projectId}">{ship.projectName}</a>
							<span class="proj-id">#{ship.projectId}</span>
						</td>
						<td>{ship.submitter ?? '—'}</td>
						<td>
							<span class="badge badge-{ship.status}">{statusLabel(ship.status)}</span>
						</td>
						<td class="td-hours">{ship.submissionType ?? '—'}</td>
						<td class="td-date">{fmtDate(ship.submittedAt)}</td>
						<td class="td-date">{fmtDate(ship.reviewedAt)}</td>
						<td>{ship.reviewer ?? '—'}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="empty">no ships have been submitted yet</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.admin-ships {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.back {
		font-size: 0.85rem;
		color: #8a8f99;
		text-decoration: none;
		margin-bottom: 0.25rem;
		display: inline-block;
	}

	.back:hover {
		color: #fff;
	}

	h1 {
		font-size: clamp(1.6rem, 3vw, 2.4rem);
		font-weight: 700;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.sub {
		font-size: 0.9rem;
		color: #8a8f99;
		margin: 0;
		max-width: 60ch;
	}

	.summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.summary-total {
		font-size: 0.85rem;
		font-weight: 600;
		color: #e8eaf0;
		margin-right: 0.25rem;
	}

	.badge {
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		border: 1px solid transparent;
		white-space: nowrap;
	}

	.badge-pending {
		background: color-mix(in srgb, #f59e0b 15%, transparent);
		color: #f59e0b;
		border-color: color-mix(in srgb, #f59e0b 35%, transparent);
	}

	.badge-soft_approved {
		background: color-mix(in srgb, #38bdf8 15%, transparent);
		color: #38bdf8;
		border-color: color-mix(in srgb, #38bdf8 35%, transparent);
	}

	.badge-approved {
		background: color-mix(in srgb, #22c55e 15%, transparent);
		color: #22c55e;
		border-color: color-mix(in srgb, #22c55e 35%, transparent);
	}

	.badge-rejected {
		background: color-mix(in srgb, #ef4444 15%, transparent);
		color: #ef4444;
		border-color: color-mix(in srgb, #ef4444 35%, transparent);
	}

	.table-wrap {
		overflow-x: auto;
		border: 1px solid #1f2937;
		border-radius: 10px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.88rem;
	}

	thead tr {
		border-bottom: 1px solid #1f2937;
	}

	th {
		text-align: left;
		padding: 0.7rem 1rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #8a8f99;
		font-weight: 600;
		white-space: nowrap;
	}

	td {
		padding: 0.85rem 1rem;
		color: #cdd0d6;
		vertical-align: middle;
		border-bottom: 1px solid #141820;
		white-space: nowrap;
	}

	tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover td {
		background: #0d1117;
	}

	.td-project a {
		font-weight: 600;
		color: #e8eaf0;
		text-decoration: none;
	}

	.td-project a:hover {
		color: #60a5fa;
		text-decoration: underline;
	}

	.proj-id {
		margin-left: 0.4rem;
		font-size: 0.78rem;
		color: #5c626c;
		font-family: 'SFMono-Regular', 'Consolas', monospace;
	}

	.td-hours {
		font-variant-numeric: tabular-nums;
	}

	.approved {
		color: #22c55e;
		margin-left: 0.25rem;
	}

	.td-date {
		color: #8a8f99;
		font-size: 0.83rem;
	}

	.empty {
		text-align: center;
		color: #5c626c;
		padding: 2rem 1rem;
	}
</style>
