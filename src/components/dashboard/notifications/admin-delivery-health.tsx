'use client';

import React, { useState } from 'react';
import { Mail, Clock, AlertTriangle, RefreshCw, CheckCircle2, Server, CheckSquare, Square, SendHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getAdminDeliveryHealth, retryOutboxJob, retryMultipleOutboxJobs } from '@/queries/notifications';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Props = {
	initialData?: Awaited<ReturnType<typeof getAdminDeliveryHealth>>;
};

type ActiveTab = 'QUEUE' | 'SENT' | 'CRON';

export default function AdminDeliveryHealth({ initialData }: Props) {
	const [activeTab, setActiveTab] = useState<ActiveTab>('QUEUE');
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [retryingId, setRetryingId] = useState<string | null>(null);

	const statusFilter = activeTab === 'SENT' ? 'SENT' : 'ALL';

	const query = useQuery({
		queryKey: ['admin', 'delivery-health', statusFilter, page, pageSize],
		queryFn: () => getAdminDeliveryHealth({ statusFilter, page, pageSize }),
		initialData,
		refetchInterval: 30_000,
	});

	const singleRetryMutation = useMutation({
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

	const bulkRetryMutation = useMutation({
		mutationFn: (ids: string[]) => retryMultipleOutboxJobs(ids),
		onSuccess: (res) => {
			toast.success(`Queued ${res.updatedCount} job(s) for immediate retry.`);
			setSelectedIds(new Set());
			query.refetch();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : 'Failed bulk retry.');
		},
	});

	const data = query.data;
	if (!data) return null;

	const { stats, pagination, failedOutbox, sentOutbox = [], automationRuns } = data;

	const toggleSelectAll = () => {
		if (selectedIds.size === failedOutbox.length) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(failedOutbox.map((item) => item.id)));
		}
	};

	const toggleSelectOne = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleRetrySelected = () => {
		const ids = Array.from(selectedIds);
		if (!ids.length) return;
		bulkRetryMutation.mutate(ids);
	};

	const handleRetryAllFailed = () => {
		const failedIds = failedOutbox.filter((item) => item.status === 'FAILED').map((item) => item.id);
		if (!failedIds.length) {
			toast.info('No failed jobs in queue to retry.');
			return;
		}
		bulkRetryMutation.mutate(failedIds);
	};

	const handleTabChange = (tab: ActiveTab) => {
		setActiveTab(tab);
		setPage(1);
		setSelectedIds(new Set());
	};

	return (
		<div className='space-y-6 text-sm'>
			{/* Stat Widgets */}
			<div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
				<button
					onClick={() => handleTabChange('SENT')}
					className={`rounded-xl border p-4 flex items-center gap-3.5 text-left transition-all ${
						activeTab === 'SENT'
							? 'border-emerald-500/50 bg-emerald-500/5 ring-2 ring-emerald-500/20'
							: 'border-border/60 bg-background hover:bg-muted/40'
					}`}
				>
					<div className='rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400'>
						<CheckCircle2 className='size-5' />
					</div>
					<div>
						<span className='text-xs text-muted-foreground block font-medium'>Sent Emails</span>
						<span className='text-xl font-bold text-foreground'>{stats.sentCount}</span>
					</div>
				</button>

				<button
					onClick={() => handleTabChange('QUEUE')}
					className={`rounded-xl border p-4 flex items-center gap-3.5 text-left transition-all ${
						activeTab === 'QUEUE'
							? 'border-amber-500/50 bg-amber-500/5 ring-2 ring-amber-500/20'
							: 'border-border/60 bg-background hover:bg-muted/40'
					}`}
				>
					<div className='rounded-lg bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400'>
						<Clock className='size-5' />
					</div>
					<div>
						<span className='text-xs text-muted-foreground block font-medium'>Pending Queue</span>
						<span className='text-xl font-bold text-foreground'>{stats.pendingCount}</span>
					</div>
				</button>

				<button
					onClick={() => handleTabChange('QUEUE')}
					className={`rounded-xl border p-4 flex items-center gap-3.5 text-left transition-all ${
						activeTab === 'QUEUE' && stats.failedCount > 0
							? 'border-destructive/50 bg-destructive/5 ring-2 ring-destructive/20'
							: 'border-border/60 bg-background hover:bg-muted/40'
					}`}
				>
					<div className='rounded-lg bg-destructive/10 p-2.5 text-destructive'>
						<AlertTriangle className='size-5' />
					</div>
					<div>
						<span className='text-xs text-muted-foreground block font-medium'>Failed Delivery Jobs</span>
						<span className='text-xl font-bold text-foreground'>{stats.failedCount}</span>
					</div>
				</button>
			</div>

			{/* Navigation Tabs */}
			<div className='flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2'>
				<div className='flex items-center gap-1 border border-border/60 bg-muted/40 p-1 rounded-xl text-xs font-semibold'>
					<button
						onClick={() => handleTabChange('QUEUE')}
						className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
							activeTab === 'QUEUE'
								? 'bg-background text-foreground shadow-xs'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						<Mail className='size-3.5 text-primary' />
						Needs Attention ({stats.pendingCount + stats.failedCount})
					</button>
					<button
						onClick={() => handleTabChange('SENT')}
						className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
							activeTab === 'SENT'
								? 'bg-background text-foreground shadow-xs'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						<CheckCircle2 className='size-3.5 text-emerald-600' />
						Sent Emails History ({stats.sentCount})
					</button>
					<button
						onClick={() => handleTabChange('CRON')}
						className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
							activeTab === 'CRON'
								? 'bg-background text-foreground shadow-xs'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						<Server className='size-3.5 text-primary' />
						Cron History ({automationRuns.length})
					</button>
				</div>

				<div className='flex items-center gap-2'>
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
			</div>

			{/* TAB 1: Outbox Queue & Bulk Selection */}
			{activeTab === 'QUEUE' && (
				<div className='rounded-xl border border-border bg-background overflow-hidden space-y-3 p-4'>
					{/* Bulk Actions Header */}
					<div className='flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3'>
						<div className='flex items-center gap-3'>
							<span className='font-semibold text-foreground text-sm flex items-center gap-2'>
								<Mail className='size-4 text-primary' />
								Outbox Queue &amp; Retries
							</span>
							{selectedIds.size > 0 && (
								<span className='text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full'>
									{selectedIds.size} Selected
								</span>
							)}
						</div>

						<div className='flex items-center gap-2'>
							{selectedIds.size > 0 && (
								<Button
									size='sm'
									onClick={handleRetrySelected}
									disabled={bulkRetryMutation.isPending}
									className='h-8 text-xs gap-1.5 bg-primary text-primary-foreground'
								>
									<SendHorizontal className='size-3.5' />
									Retry Selected ({selectedIds.size})
								</Button>
							)}

							{stats.failedCount > 0 && (
								<Button
									size='sm'
									variant='outline'
									onClick={handleRetryAllFailed}
									disabled={bulkRetryMutation.isPending}
									className='h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10'
								>
									<RefreshCw className='size-3.5' />
									Retry All Failed ({stats.failedCount})
								</Button>
							)}
						</div>
					</div>

					{failedOutbox.length === 0 ? (
						<p className='py-8 text-center text-xs text-muted-foreground italic'>
							No failed or pending email jobs in queue.
						</p>
					) : (
						<>
							<div className='overflow-x-auto'>
								<table className='w-full min-w-[750px] text-xs text-left'>
									<thead className='border-b border-border bg-muted/30 text-muted-foreground uppercase text-[11px] font-semibold'>
										<tr>
											<th className='p-2.5 w-10 text-center'>
												<button
													onClick={toggleSelectAll}
													className='text-muted-foreground hover:text-primary transition-colors mt-0.5'
													title='Select All'
												>
													{selectedIds.size > 0 && selectedIds.size === failedOutbox.length ? (
														<CheckSquare className='size-4 text-primary' />
													) : (
														<Square className='size-4' />
													)}
												</button>
											</th>
											<th className='p-2.5'>Recipient / Template</th>
											<th className='p-2.5'>Event</th>
											<th className='p-2.5'>Attempts</th>
											<th className='p-2.5'>Status / Error</th>
											<th className='p-2.5 text-right'>Action</th>
										</tr>
									</thead>
									<tbody>
										{failedOutbox.map((job) => {
											const isSelected = selectedIds.has(job.id);
											return (
												<tr
													key={job.id}
													className={`border-b border-border/40 last:border-0 align-top transition-colors ${
														isSelected ? 'bg-primary/5' : 'hover:bg-muted/20'
													}`}
												>
													<td className='p-2.5 text-center'>
														<button
															onClick={() => toggleSelectOne(job.id)}
															className='text-muted-foreground hover:text-primary transition-colors mt-0.5'
														>
															{isSelected ? (
																<CheckSquare className='size-4 text-primary' />
															) : (
																<Square className='size-4' />
															)}
														</button>
													</td>
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
															disabled={retryingId === job.id || singleRetryMutation.isPending}
															onClick={() => singleRetryMutation.mutate(job.id)}
															className='h-7 text-[11px] px-2.5'
														>
															{retryingId === job.id ? 'Retrying…' : 'Retry'}
														</Button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{/* Pagination Controls */}
							{pagination && (
								<div className='flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs'>
									<div className='flex items-center gap-2 text-muted-foreground'>
										<span>Per page:</span>
										<select
											value={pageSize}
											onChange={(e) => {
												setPageSize(Number(e.target.value));
												setPage(1);
											}}
											className='bg-background border border-border/60 rounded px-2 py-1 text-foreground font-medium text-xs focus:ring-1 focus:ring-primary'
										>
											<option value={10}>10</option>
											<option value={25}>25</option>
											<option value={50}>50</option>
											<option value={100}>100</option>
										</select>
										<span className='ml-2 font-medium text-foreground'>
											Showing {Math.min(pagination.totalCount, (page - 1) * pageSize + 1)} - {Math.min(page * pageSize, pagination.totalCount)} of {pagination.totalCount} items
										</span>
									</div>

									<div className='flex items-center gap-1.5'>
										<Button
											variant='outline'
											size='sm'
											disabled={page <= 1}
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											className='h-7 text-xs px-2.5 gap-1'
										>
											<ChevronLeft className='size-3' /> Previous
										</Button>
										<span className='text-muted-foreground font-medium px-2'>
											Page {pagination.page} of {pagination.totalPages}
										</span>
										<Button
											variant='outline'
											size='sm'
											disabled={page >= pagination.totalPages}
											onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
											className='h-7 text-xs px-2.5 gap-1'
										>
											Next <ChevronRight className='size-3' />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			)}

			{/* TAB 2: Sent Emails History */}
			{activeTab === 'SENT' && (
				<div className='rounded-xl border border-border bg-background overflow-hidden space-y-3 p-4'>
					<div className='flex items-center justify-between border-b border-border/40 pb-3'>
						<div className='flex items-center gap-2'>
							<CheckCircle2 className='size-4 text-emerald-600' />
							<h3 className='font-semibold text-foreground text-sm'>Successfully Sent Emails History</h3>
						</div>
						<span className='text-xs text-muted-foreground'>Total Delivered: {stats.sentCount}</span>
					</div>

					{sentOutbox.length === 0 ? (
						<p className='py-8 text-center text-xs text-muted-foreground italic'>
							No delivered email records logged yet.
						</p>
					) : (
						<div className='overflow-x-auto'>
							<table className='w-full min-w-[700px] text-xs text-left'>
								<thead className='border-b border-border bg-muted/30 text-muted-foreground uppercase text-[11px] font-semibold'>
									<tr>
										<th className='p-2.5'>Recipient / Email</th>
										<th className='p-2.5'>Template</th>
										<th className='p-2.5'>Event</th>
										<th className='p-2.5'>Delivered Date</th>
										<th className='p-2.5 text-right'>Status</th>
									</tr>
								</thead>
								<tbody>
									{sentOutbox.map((job) => (
										<tr key={job.id} className='border-b border-border/40 last:border-0 hover:bg-muted/20'>
											<td className='p-2.5 font-medium text-foreground'>
												{job.recipient.email}
											</td>
											<td className='p-2.5 text-muted-foreground font-mono text-[11px]'>
												{job.templateKey}
											</td>
											<td className='p-2.5 capitalize text-foreground'>
												{job.sourceEvent.eventType.replaceAll('.', ' ')}
											</td>
											<td className='p-2.5 text-muted-foreground'>
												{job.sentAt ? new Date(job.sentAt).toLocaleString() : job.updatedAt ? new Date(job.updatedAt).toLocaleString() : 'Delivered'}
											</td>
											<td className='p-2.5 text-right'>
												<span className='inline-block bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold'>
													SENT
												</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{/* TAB 3: Automation Cron History */}
			{activeTab === 'CRON' && (
				<div className='rounded-xl border border-border bg-background p-4 space-y-3'>
					<div className='flex items-center justify-between border-b border-border/40 pb-3'>
						<div className='flex items-center gap-2'>
							<Server className='size-4 text-primary' />
							<h3 className='font-semibold text-foreground text-sm'>Automation Cron Execution Logs</h3>
						</div>
					</div>

					{automationRuns.length === 0 ? (
						<p className='py-8 text-center text-xs text-muted-foreground italic'>
							No background automation runs recorded yet.
						</p>
					) : (
						<div className='overflow-x-auto'>
							<table className='w-full min-w-[650px] text-xs text-left'>
								<thead className='border-b border-border bg-muted/30 text-muted-foreground uppercase text-[11px] font-semibold'>
									<tr>
										<th className='p-2.5'>Started At</th>
										<th className='p-2.5'>Finished At</th>
										<th className='p-2.5'>Status</th>
										<th className='p-2.5'>Scanned / Advanced / Failed</th>
									</tr>
								</thead>
								<tbody>
									{automationRuns.map((run) => (
										<tr key={run.id} className='border-b border-border/40 last:border-0 hover:bg-muted/20'>
											<td className='p-2.5 font-medium'>
												{new Date(run.startedAt).toLocaleString()}
											</td>
											<td className='p-2.5 text-muted-foreground'>
												{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : 'In Progress'}
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
			)}
		</div>
	);
}
