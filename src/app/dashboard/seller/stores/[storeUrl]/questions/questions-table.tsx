'use client';

import React, { FC, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
	Search,
	MessageSquare,
	ThumbsUp,
	CheckCircle2,
	Clock,
	Pin,
	Trash2,
	Eye,
	EyeOff,
	Send,
	ExternalLink,
	Loader2,
	AlertCircle,
	HelpCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	StoreProductQAItem,
	StoreProductQAResponse,
	getStoreProductQA,
	createProductAnswer,
	moderateProductQuestion,
	deleteProductQuestion,
} from '@/queries/qa';
import { QAModerationStatus } from '@prisma/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Props {
	storeUrl: string;
	initialData: StoreProductQAResponse;
}

export default function SellerQuestionsTable({ storeUrl, initialData }: Props) {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<'all' | 'needs_answer' | 'answered'>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedQuestion, setSelectedQuestion] = useState<StoreProductQAItem | null>(null);
	const [answerText, setAnswerText] = useState('');
	const [isAnswerDialogOpen, setIsAnswerDialogOpen] = useState(false);
	const [isPending, startTransition] = useTransition();

	const { data, isLoading } = useQuery({
		queryKey: ['seller-qa', storeUrl, 1, 30, searchQuery, activeTab],
		queryFn: () =>
			getStoreProductQA(storeUrl, {
				page: 1,
				limit: 30,
				search: searchQuery,
				filter: activeTab,
			}),
		initialData: activeTab === 'all' && !searchQuery ? initialData : undefined,
	});

	const currentQuestions = data?.questions ?? initialData.questions;
	const counts = data?.counts ?? initialData.counts;

	// Submit Answer Mutation
	const submitAnswerMutation = useMutation({
		mutationFn: async ({ questionId, text }: { questionId: string; text: string }) => {
			const res = await createProductAnswer({
				questionId,
				answer: text.trim(),
			});
			if (!res.success) throw new Error(res.error || 'Failed to post answer.');
			return res.answer;
		},
		onSuccess: () => {
			toast.success('Your answer has been posted as Official Seller!');
			setIsAnswerDialogOpen(false);
			setAnswerText('');
			setSelectedQuestion(null);
			queryClient.invalidateQueries({ queryKey: ['seller-qa', storeUrl] });
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Could not post answer.');
		},
	});

	const handleOpenAnswerDialog = (q: StoreProductQAItem) => {
		setSelectedQuestion(q);
		// Pre-fill existing seller answer if one exists
		const existingSellerAnswer = q.answers.find((a) => a.isOfficialSeller);
		setAnswerText(existingSellerAnswer?.answer || '');
		setIsAnswerDialogOpen(true);
	};

	const handleTogglePin = async (q: StoreProductQAItem) => {
		startTransition(async () => {
			const res = await moderateProductQuestion(q.id, { isPinned: !q.isPinned });
			if (res.success) {
				toast.success(q.isPinned ? 'Question unpinned.' : 'Question pinned to top!');
				queryClient.invalidateQueries({ queryKey: ['seller-qa', storeUrl] });
			} else {
				toast.error(res.error || 'Failed to update pin state.');
			}
		});
	};

	const handleToggleStatus = async (q: StoreProductQAItem) => {
		const newStatus =
			q.status === QAModerationStatus.PUBLISHED
				? QAModerationStatus.HIDDEN
				: QAModerationStatus.PUBLISHED;
		startTransition(async () => {
			const res = await moderateProductQuestion(q.id, { status: newStatus });
			if (res.success) {
				toast.success(
					newStatus === QAModerationStatus.HIDDEN
						? 'Question hidden from product page.'
						: 'Question published to product page.'
				);
				queryClient.invalidateQueries({ queryKey: ['seller-qa', storeUrl] });
			} else {
				toast.error(res.error || 'Failed to update status.');
			}
		});
	};

	const handleDelete = async (questionId: string) => {
		if (!confirm('Are you sure you want to delete this question?')) return;
		startTransition(async () => {
			const res = await deleteProductQuestion(questionId);
			if (res.success) {
				toast.success('Question deleted.');
				queryClient.invalidateQueries({ queryKey: ['seller-qa', storeUrl] });
			} else {
				toast.error(res.error || 'Failed to delete question.');
			}
		});
	};

	return (
		<div className='space-y-6'>
			{/* Filter Tabs & Search Header */}
			<div className='flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center'>
				<div className='flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border/50'>
					<button
						type='button'
						onClick={() => setActiveTab('all')}
						className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
							activeTab === 'all'
								? 'bg-background text-foreground shadow-xs'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						All Questions ({counts.all})
					</button>
					<button
						type='button'
						onClick={() => setActiveTab('needs_answer')}
						className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
							activeTab === 'needs_answer'
								? 'bg-background text-foreground shadow-xs'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						{counts.needsAnswer > 0 && (
							<span className='w-2 h-2 rounded-full bg-amber-500 animate-pulse' />
						)}
						Needs Answer ({counts.needsAnswer})
					</button>
					<button
						type='button'
						onClick={() => setActiveTab('answered')}
						className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
							activeTab === 'answered'
								? 'bg-background text-foreground shadow-xs'
								: 'text-muted-foreground hover:text-foreground'
						}`}
					>
						Answered ({counts.answered})
					</button>
				</div>

				<div className='relative w-full sm:w-72'>
					<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
					<Input
						placeholder='Search question, product, customer...'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className='pl-9 h-9 text-xs bg-muted/30'
					/>
				</div>
			</div>

			{/* Questions Table */}
			<div className='rounded-xl border bg-card/60 shadow-xs overflow-hidden'>
				<Table>
					<TableHeader>
						<TableRow className='bg-muted/40 hover:bg-muted/40'>
							<TableHead className='w-[200px] text-xs font-semibold'>Customer</TableHead>
							<TableHead className='w-[180px] text-xs font-semibold'>Product</TableHead>
							<TableHead className='min-w-[280px] text-xs font-semibold'>Question</TableHead>
							<TableHead className='w-[100px] text-xs font-semibold text-center'>Helpful</TableHead>
							<TableHead className='w-[140px] text-xs font-semibold'>Answer Status</TableHead>
							<TableHead className='w-[100px] text-xs font-semibold text-right'>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={6} className='h-32 text-center text-muted-foreground'>
									<div className='flex items-center justify-center gap-2 text-xs'>
										<Loader2 className='h-4 w-4 animate-spin' />
										Loading customer questions...
									</div>
								</TableCell>
							</TableRow>
						) : currentQuestions.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className='h-32 text-center text-muted-foreground'>
									<div className='flex flex-col items-center justify-center gap-1 py-6'>
										<HelpCircle className='h-8 w-8 text-muted-foreground/40 stroke-1' />
										<p className='text-sm font-medium text-foreground mt-1'>No questions found</p>
										<p className='text-xs text-muted-foreground'>
											{searchQuery
												? 'No questions match your current search.'
												: 'Customers have not asked any questions in this category yet.'}
										</p>
									</div>
								</TableCell>
							</TableRow>
						) : (
							currentQuestions.map((q) => (
								<TableRow key={q.id} className='hover:bg-muted/30 transition-colors'>
									{/* Customer Details */}
									<TableCell>
										<div className='flex items-center gap-2.5'>
											<Avatar className='h-8 w-8 shrink-0'>
												<AvatarImage src={q.customer.picture} />
												<AvatarFallback className='text-[10px] uppercase font-bold bg-primary/10 text-primary'>
													{q.customer.name.slice(0, 2)}
												</AvatarFallback>
											</Avatar>
											<div className='min-w-0'>
												<p className='text-xs font-semibold text-foreground truncate'>
													{q.customer.name}
												</p>
												<p className='text-[11px] text-muted-foreground truncate' title={q.customer.email}>
													{q.customer.email || 'No email provided'}
												</p>
											</div>
										</div>
									</TableCell>

									{/* Product Details */}
									<TableCell>
										<Link
											href={`/product/${q.product.slug}`}
											target='_blank'
											className='group flex items-center gap-2 text-xs font-medium text-foreground hover:text-primary transition-colors'
										>
											<div className='relative w-8 h-8 rounded-md bg-muted border overflow-hidden shrink-0'>
												<Image
													src={q.product.image}
													alt={q.product.name}
													fill
													className='object-cover'
												/>
											</div>
											<span className='truncate group-hover:underline' title={q.product.name}>
												{q.product.name}
											</span>
											<ExternalLink className='w-3 h-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity' />
										</Link>
									</TableCell>

									{/* Question & Date */}
									<TableCell>
										<div className='space-y-1'>
											<div className='flex items-center gap-1.5 flex-wrap'>
												{q.isPinned && (
													<Badge
														variant='outline'
														className='bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] py-0 h-4 gap-1'
													>
														<Pin className='w-2.5 h-2.5' />
														Pinned
													</Badge>
												)}
												{q.status === QAModerationStatus.HIDDEN && (
													<Badge
														variant='outline'
														className='bg-destructive/10 text-destructive border-destructive/20 text-[10px] py-0 h-4'
													>
														Hidden
													</Badge>
												)}
												<span className='text-[11px] text-muted-foreground'>
													{new Date(q.createdAt).toLocaleDateString()}
												</span>
											</div>
											<p className='text-xs text-foreground font-medium leading-snug'>
												{q.question}
											</p>
										</div>
									</TableCell>

									{/* Helpful Votes */}
									<TableCell className='text-center'>
										<div className='inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted/40 px-2 py-1 rounded-md'>
											<ThumbsUp className='w-3 h-3' />
											<span>{q.helpfulCount}</span>
										</div>
									</TableCell>

									{/* Answer Status */}
									<TableCell>
										{q.hasSellerAnswer ? (
											<div className='space-y-1'>
												<Badge
													variant='outline'
													className='gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold py-0.5'
												>
													<CheckCircle2 className='w-2.5 h-2.5' />
													Answered by Seller
												</Badge>
												{q.answers.length > 0 && (
													<p
														className='text-[11px] text-muted-foreground line-clamp-1 italic'
														title={q.answers[0].answer}
													>
														"{q.answers[0].answer}"
													</p>
												)}
											</div>
										) : (
											<Badge
												variant='outline'
												className='gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-semibold py-0.5'
											>
												<Clock className='w-2.5 h-2.5' />
												Needs Answer
											</Badge>
										)}
									</TableCell>

									{/* Actions Dropdown & Reply Button */}
									<TableCell className='text-right'>
										<div className='flex items-center justify-end gap-1'>
											<Button
												variant='outline'
												size='sm'
												onClick={() => handleOpenAnswerDialog(q)}
												className='h-7 text-xs gap-1 shadow-xs'
											>
												<MessageSquare className='w-3 h-3' />
												{q.hasSellerAnswer ? 'Edit' : 'Answer'}
											</Button>

											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant='ghost' size='sm' className='h-7 w-7 p-0'>
														•••
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align='end' className='w-44 text-xs'>
													<DropdownMenuLabel>Moderation</DropdownMenuLabel>
													<DropdownMenuItem
														onClick={() => handleTogglePin(q)}
														disabled={isPending}
														className='gap-2 cursor-pointer'
													>
														<Pin className='w-3.5 h-3.5' />
														{q.isPinned ? 'Unpin from Top' : 'Pin to Top'}
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => handleToggleStatus(q)}
														disabled={isPending}
														className='gap-2 cursor-pointer'
													>
														{q.status === QAModerationStatus.PUBLISHED ? (
															<>
																<EyeOff className='w-3.5 h-3.5 text-muted-foreground' />
																Hide from Shoppers
															</>
														) : (
															<>
																<Eye className='w-3.5 h-3.5 text-emerald-600' />
																Publish to Shoppers
															</>
														)}
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() => handleDelete(q.id)}
														disabled={isPending}
														className='gap-2 text-destructive cursor-pointer focus:text-destructive'
													>
														<Trash2 className='w-3.5 h-3.5' />
														Delete Question
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Answer Question Modal Dialog */}
			<Dialog open={isAnswerDialogOpen} onOpenChange={setIsAnswerDialogOpen}>
				<DialogContent className='sm:max-w-lg'>
					<DialogHeader>
						<DialogTitle>Answer Customer Question</DialogTitle>
						<DialogDescription>
							Your reply will display with the Official Seller badge on the product page.
						</DialogDescription>
					</DialogHeader>

					{selectedQuestion && (
						<div className='space-y-4 py-2'>
							{/* Customer Question Card */}
							<div className='rounded-lg bg-muted/50 p-3.5 border text-xs space-y-1.5'>
								<div className='flex items-center justify-between text-muted-foreground'>
									<span className='font-semibold text-foreground'>
										{selectedQuestion.customer.name} asks:
									</span>
									<span>{new Date(selectedQuestion.createdAt).toLocaleDateString()}</span>
								</div>
								<p className='text-foreground font-medium text-sm leading-snug'>
									"{selectedQuestion.question}"
								</p>
								<p className='text-[11px] text-muted-foreground'>
									Product: <span className='font-medium text-foreground'>{selectedQuestion.product.name}</span>
								</p>
							</div>

							{/* Answer Textarea */}
							<div className='space-y-2'>
								<Textarea
									placeholder='Write your official seller answer here...'
									value={answerText}
									onChange={(e) => setAnswerText(e.target.value)}
									rows={5}
									maxLength={1000}
									className='resize-none text-sm'
								/>
								<div className='flex justify-between items-center text-xs text-muted-foreground'>
									<span>Min 2 characters</span>
									<span>{answerText.length}/1000</span>
								</div>
							</div>
						</div>
					)}

					<DialogFooter className='flex flex-row justify-end items-center gap-3 pt-3'>
						<Button
							variant='outline'
							onClick={() => setIsAnswerDialogOpen(false)}
							disabled={submitAnswerMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (!selectedQuestion) return;
								submitAnswerMutation.mutate({
									questionId: selectedQuestion.id,
									text: answerText,
								});
							}}
							disabled={submitAnswerMutation.isPending || answerText.trim().length < 2}
							className='gap-2'
						>
							{submitAnswerMutation.isPending ? (
								<Loader2 className='w-4 h-4 animate-spin' />
							) : (
								<Send className='w-4 h-4' />
							)}
							Post Official Answer
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
