'use client';

import React, { useState } from 'react';
import { Mail, Clock, AlertTriangle, RefreshCw, CheckCircle2, Server } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getAdminDeliveryHealth, retryOutboxJob } from '@/queries/notifications';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Props = {
	initialData?: Awaited<ReturnType<typeof getAdminDeliveryHealth>>;
};

export default function AdminDeliveryHealth({ initialData }: Props) {
	const [retryingId, setRetryingId] = useState<string | null>(null);

	const query = useQuery({
		queryKey: ['admin', 'delivery-health'],
		queryFn: getAdminDeliveryHealth,
		initialData,
		refetchInterval: 30_000,
	});

	const retryMutation = useMutation({
		mutationFn: (outboxId: string) => retryOutboxJob(outboxId),
		onMutate: (id) => setRetryingId(id),
		onSuccess: () => {
			toast.success('Outbox job queued for retry.');
			query.refetch();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : 'Failed to retry job.');
		},
		onSettled: () => setRetryingId(null),
	});

	const data = query.data;
	if (!data) return null;

	const { stats, failedOutbox, automationRuns } = data;

	return (
		<div className='space-y-6 text-sm'>
			{/* Stats Section */}
			<div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
				<div className='rounded-xl border border-border/60 bg-background p-4 flex items-center gap-3.5'>
					<div className='rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400'>
						<CheckCircle2 className='size-5' />
					</div>
					<div>
						<span className='text-xs text-muted-foreground block font-medium'>Sent Emails</span>
						<span className='text-xl font-bold text-foreground'>{stats.sentCount}</span>
					</div>
				</div>

				<div className='rounded-xl border border-border/60 bg-background p-4 flex items-center gap-3.5'>
					<div className='rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400'>
						<Clock className='size-5' />
					</div>
					<div>
						<span className='text-xs text-muted-foreground block font-medium'>Pending Queue</span>
						<span className='text-xl font-bold text-foreground'>{stats.pendingCount}</span>
					</div>
				</div>

				<div className='rounded-xl border border-border/60 bg-background p-4 flex items-center gap-3.5'>
					<div className='rounded-lg bg-destructive/10 p-2.5 text-destructive'>
						<AlertTriangle className='size-5' />
					</div>
					<div>
						<span className='text-xs text-muted-foreground block font-medium'>Failed Delivery Jobs</span>
						<span className='text-xl font-bold text-foreground'>{stats.failedCount}</span>
					</div>
				</div>
			</div>

			{/* Outbox Retry Table */}
			<div className='rounded-xl border border-border bg-background overflow-hidden space-y-3 p-4'>
				<div className='flex items-center justify-between border-b border-border/40 pb-3'>
					<div className='flex items-center gap-2'>
						<Mail className='size-4 text-primary' />
						<h3 className='font-semibold text-foreground text-sm'>Outbox Delivery Queue</h3>
					</div>
					<Button
						variant='outline'
						size='sm'
						onClick={() => query.refetch()}
						disabled={query.isFetching}
						className='h-8 text-xs gap-1'
					>
						<RefreshCw className={`size-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
						Refresh
					</Button>
				</div>

				{failedOutbox.length === 0 ? (
					<p className='py-6 text-center text-xs text-muted-foreground italic'>
						No failed or pending email jobs in queue.
					</p>
				) : (
					<div className='overflow-x-auto'>
						<table className='w-full min-w-[700px] text-xs text-left'>
							<thead className='border-b border-border bg-muted/30 text-muted-foreground uppercase text-[11px] font-semibold'>
								<tr>
									<th className='p-2.5'>Recipient / Template</th>
									<th className='p-2.5'>Event</th>
									<th className='p-2.5'>Attempts</th>
									<th className='p-2.5'>Status / Error</th>
									<th className='p-2.5 text-right'>Action</th>
								</tr>
							</thead>
							<tbody>
								{failedOutbox.map((job) => (
									<tr key={job.id} className='border-b border-border/40 last:border-0 align-top'>
										<td className='p-2.5'>
											<div className='font-medium text-foreground'>{job.recipient.email}</div>
											<div className='text-[11px] text-muted-foreground'>Template: {job.templateKey}</div>
										</td>
										<td className='p-2.5'>
											<span className='capitalize font-medium text-foreground'>
												{job.sourceEvent.eventType.replaceAll('.', ' ')}
											</span>
										</td>
										<td className='p-2.5 font-semibold'>{job.attemptCount}</td>
										<td className='p-2.5 max-w-xs'>
											<span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
												job.status === 'FAILED'
													? 'bg-destructive/10 text-destructive'
													: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
											}`}>
												{job.status}
											</span>
											{job.lastError && (
												<p className='text-[11px] text-muted-foreground truncate max-w-xs mt-0.5' title={job.lastError}>
													{job.lastError}
												</p>
											)}
										</td>
										<td className='p-2.5 text-right'>
											<Button
												size='sm'
												variant='outline'
												disabled={retryingId === job.id || retryMutation.isPending}
												onClick={() => retryMutation.mutate(job.id)}
												className='h-7 text-[11px] px-2.5'
											>
												{retryingId === job.id ? 'Retrying…' : 'Retry'}
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Automation Runs */}
			<div className='rounded-xl border border-border bg-background p-4 space-y-3'>
				<div className='flex items-center gap-2 border-b border-border/40 pb-3'>
					<Server className='size-4 text-primary' />
					<h3 className='font-semibold text-foreground text-sm'>Automation Cron History</h3>
				</div>

				{automationRuns.length === 0 ? (
					<p className='py-4 text-center text-xs text-muted-foreground italic'>
						No background automation runs recorded yet.
					</p>
				) : (
					<div className='overflow-x-auto'>
						<table className='w-full min-w-[650px] text-xs text-left'>
							<thead className='border-b border-border bg-muted/30 text-muted-foreground uppercase text-[11px] font-semibold'>
								<tr>
									<th className='p-2.5'>Started At</th>
									<th className='p-2.5'>Status</th>
									<th className='p-2.5'>Scanned / Advanced / Failed</th>
								</tr>
							</thead>
							<tbody>
								{automationRuns.map((run) => (
									<tr key={run.id} className='border-b border-border/40 last:border-0'>
										<td className='p-2.5 font-medium'>
											{new Date(run.startedAt).toLocaleString()}
										</td>
										<td className='p-2.5'>
											<span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
												run.status === 'SUCCEEDED'
													? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
													: run.status === 'FAILED'
													? 'bg-destructive/10 text-destructive'
													: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
											}`}>
												{run.status}
											</span>
										</td>
										<td className='p-2.5 text-muted-foreground'>
											Scanned: <span className='font-semibold text-foreground'>{run.scannedCount}</span> · Advanced: <span className='font-semibold text-foreground'>{run.advancedCount}</span> · Failed: <span className='font-semibold text-foreground'>{run.failedCount}</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
