'use client';

import React, { useState, useTransition } from 'react';
import {
	Feedback,
	FeedbackCategory,
	FeedbackStatus,
	FeedbackUserRole,
} from '@prisma/client';
import { FeedbackAdminMetrics } from '@/lib/feedback/types';
import {
	updateFeedbackStatus,
	deleteFeedback,
} from '@/queries/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Search,
	Star,
	Bug,
	Lightbulb,
	Code2,
	Sparkles,
	MessageSquare,
	ShieldCheck,
	Laptop,
	Trash2,
	Eye,
	X,
	CheckCircle,
	Clock,
	AlertTriangle,
	Archive,
	CheckCheck,
	RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Props {
	initialFeedbacks: Feedback[];
	metrics: FeedbackAdminMetrics;
}

const STATUS_COLORS: Record<FeedbackStatus, { bg: string; text: string; border: string }> = {
	NEW: {
		bg: 'bg-blue-500/10 dark:bg-blue-500/15',
		text: 'text-blue-600 dark:text-blue-400',
		border: 'border-blue-500/30',
	},
	IN_REVIEW: {
		bg: 'bg-amber-500/10 dark:bg-amber-500/15',
		text: 'text-amber-600 dark:text-amber-400',
		border: 'border-amber-500/30',
	},
	PLANNED: {
		bg: 'bg-purple-500/10 dark:bg-purple-500/15',
		text: 'text-purple-600 dark:text-purple-400',
		border: 'border-purple-500/30',
	},
	RESOLVED: {
		bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
		text: 'text-emerald-600 dark:text-emerald-400',
		border: 'border-emerald-500/30',
	},
	ARCHIVED: {
		bg: 'bg-neutral-500/10 dark:bg-neutral-500/15',
		text: 'text-neutral-600 dark:text-neutral-400',
		border: 'border-neutral-500/30',
	},
};

const CATEGORY_META: Record<
	FeedbackCategory,
	{ label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
	BUG: { label: 'Bug Report', icon: Bug, color: 'text-red-500 bg-red-500/10 border-red-500/20' },
	FEATURE_REQUEST: { label: 'Feature Request', icon: Lightbulb, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
	UI_UX: { label: 'UI & UX', icon: Sparkles, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
	DEVELOPER_IMPRESSION: { label: 'Code & Architecture', icon: Code2, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20' },
	GENERAL: { label: 'General / Praise', icon: MessageSquare, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
};

export default function FeedbackAdminClient({
	initialFeedbacks,
	metrics: initialMetrics,
}: Props) {
	const [feedbacks, setFeedbacks] = useState<Feedback[]>(initialFeedbacks);
	const [metrics, setMetrics] = useState<FeedbackAdminMetrics>(initialMetrics);

	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('ALL');
	const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
	const [roleFilter, setRoleFilter] = useState<string>('ALL');

	const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
	const [adminNotes, setAdminNotes] = useState('');
	const [isPending, startTransition] = useTransition();

	// Filter feedbacks locally for snappy interaction
	const filtered = feedbacks.filter((item) => {
		if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
		if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
		if (roleFilter !== 'ALL' && item.role !== roleFilter) return false;
		if (searchQuery.trim() !== '') {
			const q = searchQuery.toLowerCase();
			const matchName = item.name.toLowerCase().includes(q);
			const matchEmail = item.email.toLowerCase().includes(q);
			const matchSubject = item.subject.toLowerCase().includes(q);
			const matchMessage = item.message.toLowerCase().includes(q);
			return matchName || matchEmail || matchSubject || matchMessage;
		}
		return true;
	});

	const handleOpenDetail = (item: Feedback) => {
		setSelectedFeedback(item);
		setAdminNotes(item.adminNotes || '');
	};

	const handleStatusChange = async (
		item: Feedback,
		newStatus: FeedbackStatus,
		notes?: string,
	) => {
		startTransition(async () => {
			try {
				const updated = await updateFeedbackStatus(item.id, {
					status: newStatus,
					adminNotes: notes ?? item.adminNotes ?? undefined,
				});

				setFeedbacks((prev) =>
					prev.map((f) => (f.id === updated.id ? updated : f)),
				);

				if (selectedFeedback?.id === updated.id) {
					setSelectedFeedback(updated);
				}

				toast.success(`Feedback status updated to ${newStatus}`);
			} catch (error: unknown) {
				const errMsg = error instanceof Error ? error.message : 'Update failed';
				toast.error(errMsg);
			}
		});
	};

	const handleSaveNotes = async () => {
		if (!selectedFeedback) return;
		startTransition(async () => {
			try {
				const updated = await updateFeedbackStatus(selectedFeedback.id, {
					status: selectedFeedback.status,
					adminNotes,
				});
				setFeedbacks((prev) =>
					prev.map((f) => (f.id === updated.id ? updated : f)),
				);
				setSelectedFeedback(updated);
				toast.success('Internal notes saved');
			} catch (error: unknown) {
				const errMsg = error instanceof Error ? error.message : 'Failed to save notes';
				toast.error(errMsg);
			}
		});
	};

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this feedback?')) return;
		startTransition(async () => {
			try {
				await deleteFeedback(id);
				setFeedbacks((prev) => prev.filter((f) => f.id !== id));
				if (selectedFeedback?.id === id) setSelectedFeedback(null);
				toast.success('Feedback deleted');
			} catch (error: unknown) {
				const errMsg = error instanceof Error ? error.message : 'Delete failed';
				toast.error(errMsg);
			}
		});
	};

	return (
		<div className='space-y-8'>
			{/* Metric Summary Cards */}
			<div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
				<div className='p-5 rounded-3xl border border-border/80 bg-card space-y-1.5'>
					<div className='flex items-center justify-between text-muted-foreground text-xs font-semibold'>
						<span>Total Submissions</span>
						<MessageSquare className='w-4 h-4 text-primary' />
					</div>
					<div className='text-2xl sm:text-3xl font-extrabold text-foreground'>
						{feedbacks.length}
					</div>
					<p className='text-[11px] text-muted-foreground'>
						All time platform feedback
					</p>
				</div>

				<div className='p-5 rounded-3xl border border-border/80 bg-card space-y-1.5'>
					<div className='flex items-center justify-between text-muted-foreground text-xs font-semibold'>
						<span>New / Unreviewed</span>
						<Clock className='w-4 h-4 text-blue-500' />
					</div>
					<div className='text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400'>
						{feedbacks.filter((f) => f.status === 'NEW').length}
					</div>
					<p className='text-[11px] text-muted-foreground'>
						Awaiting review or triage
					</p>
				</div>

				<div className='p-5 rounded-3xl border border-border/80 bg-card space-y-1.5'>
					<div className='flex items-center justify-between text-muted-foreground text-xs font-semibold'>
						<span>Reported Bugs</span>
						<Bug className='w-4 h-4 text-red-500' />
					</div>
					<div className='text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400'>
						{feedbacks.filter((f) => f.category === 'BUG').length}
					</div>
					<p className='text-[11px] text-muted-foreground'>
						Defects requiring reproduction
					</p>
				</div>

				<div className='p-5 rounded-3xl border border-border/80 bg-card space-y-1.5'>
					<div className='flex items-center justify-between text-muted-foreground text-xs font-semibold'>
						<span>Avg Satisfaction</span>
						<Star className='w-4 h-4 fill-amber-400 text-amber-400' />
					</div>
					<div className='text-2xl sm:text-3xl font-extrabold text-amber-500'>
						{metrics.averageRating !== null
							? `${metrics.averageRating} / 5.0`
							: '5.0 / 5.0'}
					</div>
					<p className='text-[11px] text-muted-foreground'>
						Weighted average sentiment
					</p>
				</div>
			</div>

			{/* Filter & Search Bar */}
			<div className='p-5 rounded-3xl border border-border/80 bg-card space-y-4'>
				<div className='flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between'>
					{/* Search */}
					<div className='relative flex-1'>
						<Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none' />
						<Input
							type='text'
							placeholder='Search by sender, email, subject, or message...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='pl-10 h-10 rounded-xl bg-background text-sm'
						/>
					</div>

					{/* Category Select */}
					<div className='flex items-center gap-2'>
						<select
							value={categoryFilter}
							onChange={(e) => setCategoryFilter(e.target.value)}
							className='h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm font-medium text-foreground outline-none cursor-pointer'
						>
							<option value='ALL'>All Categories</option>
							<option value='FEATURE_REQUEST'>Feature Request</option>
							<option value='BUG'>Bug Report</option>
							<option value='UI_UX'>UI & UX</option>
							<option value='DEVELOPER_IMPRESSION'>Code & Architecture</option>
							<option value='GENERAL'>General / Praise</option>
						</select>

						{/* Role Select */}
						<select
							value={roleFilter}
							onChange={(e) => setRoleFilter(e.target.value)}
							className='h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm font-medium text-foreground outline-none cursor-pointer'
						>
							<option value='ALL'>All Roles</option>
							<option value='GUEST'>Guest</option>
							<option value='CUSTOMER'>Customer</option>
							<option value='SELLER'>Seller</option>
							<option value='DEVELOPER'>Developer</option>
						</select>
					</div>
				</div>

				{/* Status Tabs */}
				<div className='flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold'>
					{['ALL', 'NEW', 'IN_REVIEW', 'PLANNED', 'RESOLVED', 'ARCHIVED'].map((st) => {
						const isSelected = statusFilter === st;
						return (
							<button
								key={st}
								type='button'
								onClick={() => setStatusFilter(st)}
								className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
									isSelected
										? 'bg-primary text-primary-foreground shadow-xs'
										: 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
								}`}
							>
								{st.replace('_', ' ')}
							</button>
						);
					})}
				</div>
			</div>

			{/* Data Table */}
			<div className='rounded-3xl border border-border/80 bg-card overflow-hidden shadow-xs'>
				{filtered.length === 0 ? (
					<div className='p-12 text-center space-y-2'>
						<MessageSquare className='w-8 h-8 text-muted-foreground mx-auto opacity-50' />
						<h4 className='font-bold text-base text-foreground'>No feedback entries found</h4>
						<p className='text-xs text-muted-foreground'>
							Try adjusting your search terms or filter selection.
						</p>
					</div>
				) : (
					<div className='overflow-x-auto'>
						<table className='w-full text-left text-sm'>
							<thead className='border-b border-border/60 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
								<tr>
									<th className='py-3.5 px-4'>Sender</th>
									<th className='py-3.5 px-4'>Category</th>
									<th className='py-3.5 px-4'>Rating</th>
									<th className='py-3.5 px-4'>Subject & Preview</th>
									<th className='py-3.5 px-4'>Status</th>
									<th className='py-3.5 px-4'>Date</th>
									<th className='py-3.5 px-4 text-right'>Actions</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-border/40'>
								{filtered.map((item) => {
									const cat = CATEGORY_META[item.category] || CATEGORY_META.GENERAL;
									const CatIcon = cat.icon;
									const stColor = STATUS_COLORS[item.status] || STATUS_COLORS.NEW;

									return (
										<tr
											key={item.id}
											className='hover:bg-muted/20 transition-colors'
										>
											{/* Sender */}
											<td className='py-4 px-4 align-top'>
												<div className='font-semibold text-foreground text-sm flex items-center gap-1.5'>
													<span>{item.name}</span>
													{item.isEmailVerified && (
														<span title='Authentic Email Verified'>
															<ShieldCheck className='w-3.5 h-3.5 text-emerald-500 shrink-0' />
														</span>
													)}
												</div>
												<div className='text-xs text-muted-foreground font-mono truncate max-w-[170px]'>
													{item.email}
												</div>
												<span className='inline-block text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-muted text-muted-foreground mt-1'>
													{item.role}
												</span>
											</td>

											{/* Category */}
											<td className='py-4 px-4 align-top'>
												<span
													className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cat.color}`}
												>
													<CatIcon className='w-3.5 h-3.5' />
													<span>{cat.label}</span>
												</span>
											</td>

											{/* Rating */}
											<td className='py-4 px-4 align-top'>
												<div className='flex items-center gap-0.5 text-amber-400'>
													{item.rating ? (
														Array.from({ length: item.rating }).map((_, i) => (
															<Star key={i} className='w-3.5 h-3.5 fill-amber-400' />
														))
													) : (
														<span className='text-xs text-muted-foreground'>—</span>
													)}
												</div>
											</td>

											{/* Subject & Preview */}
											<td className='py-4 px-4 align-top max-w-sm'>
												<div className='font-bold text-foreground truncate'>
													{item.subject}
												</div>
												<p className='text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed'>
													{item.message}
												</p>
											</td>

											{/* Status Dropdown */}
											<td className='py-4 px-4 align-top'>
												<select
													value={item.status}
													onChange={(e) =>
														handleStatusChange(
															item,
															e.target.value as FeedbackStatus,
														)
													}
													className={`text-xs font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${stColor.bg} ${stColor.text} ${stColor.border}`}
												>
													<option value='NEW'>NEW</option>
													<option value='IN_REVIEW'>IN REVIEW</option>
													<option value='PLANNED'>PLANNED</option>
													<option value='RESOLVED'>RESOLVED</option>
													<option value='ARCHIVED'>ARCHIVED</option>
												</select>
											</td>

											{/* Date */}
											<td className='py-4 px-4 align-top text-xs text-muted-foreground whitespace-nowrap'>
												{new Date(item.createdAt).toLocaleDateString()}
											</td>

											{/* Actions */}
											<td className='py-4 px-4 align-top text-right whitespace-nowrap space-x-1'>
												<Button
													type='button'
													variant='ghost'
													size='sm'
													onClick={() => handleOpenDetail(item)}
													className='h-8 px-2.5 text-xs gap-1'
												>
													<Eye className='w-3.5 h-3.5' />
													<span>Inspect</span>
												</Button>
												<Button
													type='button'
													variant='ghost'
													size='sm'
													onClick={() => handleDelete(item.id)}
													className='h-8 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10'
												>
													<Trash2 className='w-3.5 h-3.5' />
												</Button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Detail Inspection Modal */}
			<AnimatePresence>
				{selectedFeedback && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'
					>
						<motion.div
							initial={{ scale: 0.95, y: 15 }}
							animate={{ scale: 1, y: 0 }}
							exit={{ scale: 0.95, y: 15 }}
							className='w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-border shadow-2xl p-6 sm:p-8 space-y-6 text-foreground'
						>
							{/* Modal Header */}
							<div className='flex items-start justify-between gap-4 border-b border-border/40 pb-4'>
								<div>
									<div className='flex items-center gap-2'>
										<span className='font-mono font-bold text-xs uppercase text-primary px-2 py-0.5 rounded bg-primary/10'>
											FB-{selectedFeedback.id.slice(0, 8).toUpperCase()}
										</span>
										<span className='text-xs text-muted-foreground'>
											{new Date(selectedFeedback.createdAt).toLocaleString()}
										</span>
									</div>
									<h3 className='text-xl font-bold mt-1.5 text-foreground'>
										{selectedFeedback.subject}
									</h3>
								</div>
								<button
									type='button'
									onClick={() => setSelectedFeedback(null)}
									className='p-1.5 rounded-lg hover:bg-muted text-muted-foreground cursor-pointer'
								>
									<X className='w-5 h-5' />
								</button>
							</div>

							{/* Sender Profile Strip */}
							<div className='grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-muted/20 border border-border/60 text-xs'>
								<div>
									<span className='text-muted-foreground block text-[10px] uppercase'>
										Sender
									</span>
									<span className='font-semibold text-foreground'>
										{selectedFeedback.name}
									</span>
								</div>
								<div>
									<span className='text-muted-foreground block text-[10px] uppercase'>
										Email
									</span>
									<span className='font-mono text-foreground truncate block'>
										{selectedFeedback.email}
									</span>
								</div>
								<div>
									<span className='text-muted-foreground block text-[10px] uppercase'>
										Role
									</span>
									<span className='font-semibold text-primary'>
										{selectedFeedback.role}
									</span>
								</div>
								<div>
									<span className='text-muted-foreground block text-[10px] uppercase'>
										Authenticity
									</span>
									<span className='text-emerald-500 font-semibold inline-flex items-center gap-1'>
										<ShieldCheck className='w-3.5 h-3.5' />
										<span>Verified</span>
									</span>
								</div>
							</div>

							{/* Full Message */}
							<div className='space-y-2'>
								<h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
									Feedback Content
								</h4>
								<div className='p-4 rounded-2xl bg-muted/30 border border-border/40 text-sm leading-relaxed whitespace-pre-wrap text-foreground'>
									{selectedFeedback.message}
								</div>
							</div>

							{/* Diagnostics Telemetry */}
							{selectedFeedback.deviceInfo && (
								<div className='space-y-2'>
									<div className='flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
										<Laptop className='w-3.5 h-3.5 text-primary' />
										<span>Auto-Captured Telemetry</span>
									</div>
									<div className='p-3.5 rounded-2xl bg-muted/20 border border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono'>
										{Object.entries(
											selectedFeedback.deviceInfo as Record<string, string>,
										).map(([k, v]) => (
											<div key={k}>
												<span className='text-[10px] text-muted-foreground block uppercase font-sans'>
													{k}
												</span>
												<span className='text-foreground truncate block'>{v}</span>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Admin Status & Notes */}
							<div className='space-y-3 pt-2 border-t border-border/40'>
								<div className='flex items-center justify-between'>
									<h4 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
										Internal Resolution Notes
									</h4>
									<div className='flex items-center gap-2'>
										<span className='text-xs text-muted-foreground'>Status:</span>
										<select
											value={selectedFeedback.status}
											onChange={(e) =>
												handleStatusChange(
													selectedFeedback,
													e.target.value as FeedbackStatus,
													adminNotes,
												)
											}
											className='h-8 px-2 rounded-lg border border-border bg-background text-xs font-bold text-foreground cursor-pointer'
										>
											<option value='NEW'>NEW</option>
											<option value='IN_REVIEW'>IN REVIEW</option>
											<option value='PLANNED'>PLANNED</option>
											<option value='RESOLVED'>RESOLVED</option>
											<option value='ARCHIVED'>ARCHIVED</option>
										</select>
									</div>
								</div>
								<Textarea
									rows={3}
									placeholder='Add private internal notes, Jira/GitHub issue link, or resolution plan...'
									value={adminNotes}
									onChange={(e) => setAdminNotes(e.target.value)}
									className='rounded-xl text-sm'
								/>
								<div className='flex justify-end'>
									<Button
										type='button'
										size='sm'
										onClick={handleSaveNotes}
										disabled={isPending}
										className='gap-1.5'
									>
										{isPending ? (
											<RefreshCw className='w-3.5 h-3.5 animate-spin' />
										) : (
											<CheckCircle className='w-3.5 h-3.5' />
										)}
										<span>Save Notes</span>
									</Button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
