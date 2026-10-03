import Link from 'next/link';
import { getBackgroundJobHealth, recoverBackgroundJobs, replayBackgroundJob } from '@/queries/background-jobs';

export const dynamic = 'force-dynamic';

export default async function BackgroundJobsPage() {
	const health = await getBackgroundJobHealth();
	return <main className='space-y-6 p-4'>
		<header className='flex flex-wrap items-center justify-between gap-4'>
			<div><h1 className='text-2xl font-bold'>Background delivery</h1>
				<p className='text-muted-foreground'>Review delayed work, failures and completed deliveries.</p></div>
			<Link href='/dashboard/admin/delivery-health' className='underline'>Email delivery health</Link>
		</header>
		<p>Processing: {health.enabled ? 'Enabled' : 'Disabled'} · Queue transport: {health.transportAvailable ? 'Configured' : 'Not configured'} · Oldest pending: {health.oldestPendingAgeSeconds}s</p>
		<p className='text-sm text-muted-foreground'>Transport configuration does not confirm delivery. Check job status and failure details below.</p>
		<div className='flex flex-wrap gap-4'>{health.counts.map(count => <div key={count.status} className='rounded border p-4'>{count.status}: {count._count._all}</div>)}</div>
		<form action={recoverBackgroundJobs}><button className='rounded border px-4 py-2'>Recover interrupted work and dispatch pending jobs</button></form>
		<div className='overflow-x-auto'><table className='w-full text-left text-sm'>
			<thead><tr><th className='p-2'>Job</th><th>Type</th><th>Status</th><th>Attempts</th><th>Processing time</th><th>Details</th><th>Action</th></tr></thead>
			<tbody>{health.jobs.map(job => <tr key={job.id} className='border-t'>
				<td className='p-2 font-mono'>{job.id.slice(0, 8)}</td><td>{job.kind}</td><td>{job.status}</td><td>{job.attempts}</td>
				<td>{job.completedAt && job.startedAt ? `${job.completedAt.getTime() - job.startedAt.getTime()}ms` : '—'}</td><td className='max-w-sm p-2'>{job.lastError ?? '—'}</td>
				<td>{['READY', 'DEAD'].includes(job.status) && <form action={replayBackgroundJob}><input type='hidden' name='jobId' value={job.id} /><button className='rounded border px-3 py-1'>Replay</button></form>}</td>
			</tr>)}</tbody>
		</table></div>
	</main>;
}
