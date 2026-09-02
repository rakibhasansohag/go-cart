'use client';

import React, { FC, useState, useTransition } from 'react';
import {
	HelpCircle,
	MessageCircleQuestion,
	MessageSquare,
	Search,
	ThumbsUp,
	CheckCircle2,
	ShoppingBag,
	Pin,
	Send,
	Plus,
	Loader2,
	ChevronDown,
	ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	ProductQAItem,
	ProductQAAnswer,
	createProductQuestion,
	createProductAnswer,
	toggleQuestionVote,
	toggleAnswerVote,
	getProductQA,
} from '@/queries/qa';
import { useUser, useClerk, SignInButton } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface LegacyQuestion {
	question: string;
	answer: string;
}

interface Props {
	productId?: string;
	storeOwnerId?: string;
	isCurrentUserAdmin?: boolean;
	questions?: LegacyQuestion[];
	initialQA?: ProductQAItem[];
	totalQuestions?: number;
}

const ProductQuestions: FC<Props> = ({
	productId,
	storeOwnerId,
	isCurrentUserAdmin = false,
	questions: legacyFaqProp = [],
	initialQA = [],
	totalQuestions: initialTotal = 0,
}) => {
	const { isSignedIn, user } = useUser();
	const { openSignIn } = useClerk();
	const queryClient = useQueryClient();
	const isSeller = Boolean(user && storeOwnerId && user.id === storeOwnerId);
	const canAnswer = Boolean(isSeller || isCurrentUserAdmin);

	const [searchQuery, setSearchQuery] = useState('');
	const [isAskDialogOpen, setIsAskDialogOpen] = useState(false);
	const [newQuestionText, setNewQuestionText] = useState('');
	const [replyingToId, setReplyingToId] = useState<string | null>(null);
	const [replyText, setReplyText] = useState('');
	const [isPending, startTransition] = useTransition();
	const [isLegacyExpanded, setIsLegacyExpanded] = useState(true);

	// Fetch dynamic QA with TanStack Query when productId is available
	const { data: qaData, isLoading } = useQuery({
		queryKey: ['product-qa', productId, 1, 20, searchQuery],
		queryFn: () =>
			productId
				? getProductQA(productId, { page: 1, limit: 20, search: searchQuery })
				: Promise.resolve({
						questions: initialQA,
						totalQuestions: initialTotal,
						page: 1,
						totalPages: 1,
						legacyFaq: legacyFaqProp,
					}),
		initialData:
			initialQA.length > 0
				? {
						questions: initialQA,
						totalQuestions: initialTotal,
						page: 1,
						totalPages: 1,
						legacyFaq: legacyFaqProp,
					}
				: undefined,
		enabled: Boolean(productId),
	});

	const dynamicQuestions = qaData?.questions ?? initialQA;
	const legacyFaqs = qaData?.legacyFaq?.length ? qaData.legacyFaq : legacyFaqProp;
	const totalCount = (qaData?.totalQuestions ?? 0) + legacyFaqs.length;

	// Submit Question Mutation
	const askMutation = useMutation({
		mutationFn: async (text: string) => {
			if (!productId) throw new Error('Product ID missing.');
			const res = await createProductQuestion({
				productId,
				question: text.trim(),
			});
			if (!res.success) throw new Error(res.error || 'Failed to submit question.');
			return res.question;
		},
		onSuccess: () => {
			toast.success('Your question has been posted!');
			setNewQuestionText('');
			setIsAskDialogOpen(false);
			queryClient.invalidateQueries({ queryKey: ['product-qa', productId] });
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Could not post question.');
		},
	});

	// Submit Answer Mutation
	const answerMutation = useMutation({
		mutationFn: async ({
			questionId,
			text,
		}: {
			questionId: string;
			text: string;
		}) => {
			const res = await createProductAnswer({
				questionId,
				answer: text.trim(),
			});
			if (!res.success) throw new Error(res.error || 'Failed to submit answer.');
			return res.answer;
		},
		onSuccess: () => {
			toast.success('Your answer has been submitted!');
			setReplyText('');
			setReplyingToId(null);
			queryClient.invalidateQueries({ queryKey: ['product-qa', productId] });
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Could not post answer.');
		},
	});

	// Toggle Question Helpful Vote
	const handleQuestionVote = async (questionId: string) => {
		if (!isSignedIn) {
			toast.info('Please sign in to vote this question as helpful.', {
				action: {
					label: 'Sign In',
					onClick: () => openSignIn?.(),
				},
			});
			return;
		}
		startTransition(async () => {
			try {
				const res = await toggleQuestionVote(questionId);
				if (!res.success) {
					toast.error(res.error || 'Failed to update vote.');
					return;
				}
				queryClient.invalidateQueries({ queryKey: ['product-qa', productId] });
			} catch {
				toast.error('Could not update vote.');
			}
		});
	};

	// Toggle Answer Helpful Vote
	const handleAnswerVote = async (answerId: string) => {
		if (!isSignedIn) {
			toast.info('Please sign in to vote this answer as helpful.', {
				action: {
					label: 'Sign In',
					onClick: () => openSignIn?.(),
				},
			});
			return;
		}
		startTransition(async () => {
			try {
				const res = await toggleAnswerVote(answerId);
				if (!res.success) {
					toast.error(res.error || 'Failed to update vote.');
					return;
				}
				queryClient.invalidateQueries({ queryKey: ['product-qa', productId] });
			} catch {
				toast.error('Could not update vote.');
			}
		});
	};

	const filteredLegacy = legacyFaqs.filter(
		(faq) =>
			!searchQuery.trim() ||
			faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
			faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<section id='questions' className='pt-6' aria-label='Product Questions and Answers'>
			{/* Section Header */}
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight text-foreground flex items-center gap-2'>
						<MessageSquare className='h-6 w-6 text-primary' />
						Questions & Answers
						<Badge variant='secondary' className='ml-2 text-xs font-semibold'>
							{totalCount}
						</Badge>
					</h2>
					<p className='text-sm text-muted-foreground mt-1'>
						Have a question about this product? Ask the seller or fellow verified buyers.
					</p>
				</div>

				{productId &&
					(!isSignedIn ? (
						<SignInButton mode='modal'>
							<Button variant='outline' className='gap-2 shadow-sm text-xs'>
								<Plus className='h-4 w-4' />
								Sign in to Ask a Question
							</Button>
						</SignInButton>
					) : (
						<Dialog open={isAskDialogOpen} onOpenChange={setIsAskDialogOpen}>
							<DialogTrigger asChild>
								<Button className='gap-2 shadow-sm'>
									<Plus className='h-4 w-4' />
									Ask a Question
								</Button>
							</DialogTrigger>
							<DialogContent className='sm:max-w-md'>
								<DialogHeader>
									<DialogTitle>Ask about this product</DialogTitle>
									<DialogDescription>
										Your question will be visible to the store seller and the community.
									</DialogDescription>
								</DialogHeader>
								<div className='space-y-3 py-2'>
									<Textarea
										placeholder='What would you like to know about dimensions, materials, or compatibility?'
										value={newQuestionText}
										onChange={(e) => setNewQuestionText(e.target.value)}
										rows={4}
										maxLength={500}
										className='resize-none text-sm'
									/>
									<div className='flex justify-between items-center text-xs text-muted-foreground'>
										<span>Min 5 characters</span>
										<span>{newQuestionText.length}/500</span>
									</div>
								</div>
								<DialogFooter className='gap-2 sm:gap-0'>
									<Button
										variant='outline'
										onClick={() => setIsAskDialogOpen(false)}
										disabled={askMutation.isPending}
									>
										Cancel
									</Button>
									<Button
										onClick={() => askMutation.mutate(newQuestionText)}
										disabled={
											askMutation.isPending || newQuestionText.trim().length < 5
										}
										className='gap-2'
									>
										{askMutation.isPending && (
											<Loader2 className='h-4 w-4 animate-spin' />
										)}
										Submit Question
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					))}
			</div>

			{/* Search & Filter Bar */}
			<div className='mt-5 relative'>
				<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
				<Input
					type='search'
					placeholder='Search existing questions & answers...'
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className='pl-9 bg-background/50 text-sm'
					aria-label='Search questions and answers'
				/>
			</div>

			{/* Questions Feed */}
			<div className='mt-6 space-y-6'>
				{isLoading && !dynamicQuestions.length && (
					<div className='py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2'>
						<Loader2 className='h-4 w-4 animate-spin text-primary' />
						Loading questions & answers...
					</div>
				)}

				{/* Interactive Community Q&A Items */}
				{dynamicQuestions.map((q) => (
					<article
						key={q.id}
						className='rounded-xl border bg-card p-5 shadow-xs transition-colors hover:border-border/80'
					>
						{/* Question Header */}
						<div className='flex items-start justify-between gap-3'>
							<div className='flex items-start gap-3 flex-1'>
								<div className='mt-0.5 rounded-full bg-primary/10 p-1.5 text-primary'>
									<MessageCircleQuestion className='h-4 w-4' />
								</div>
								<div className='space-y-1 flex-1'>
									<div className='flex items-center gap-2 flex-wrap'>
										<h3 className='font-semibold text-foreground text-base leading-snug'>
											{q.question}
										</h3>
										{q.isPinned && (
											<Badge
												variant='outline'
												className='gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 text-[11px]'
											>
												<Pin className='h-3 w-3' />
												Pinned
											</Badge>
										)}
									</div>
									<div className='flex items-center gap-2 text-xs text-muted-foreground'>
										<span>Asked by {q.user?.name || 'Shopper'}</span>
										<span>•</span>
										<time dateTime={q.createdAt}>
											{new Date(q.createdAt).toLocaleDateString(undefined, {
												month: 'short',
												day: 'numeric',
												year: 'numeric',
											})}
										</time>
									</div>
								</div>
							</div>

							{/* Question Helpful Vote Button */}
							<Button
								variant={q.hasVoted ? 'default' : 'outline'}
								size='sm'
								onClick={() => handleQuestionVote(q.id)}
								disabled={isPending}
								aria-label='Helpful question vote'
								aria-pressed={q.hasVoted}
								className='h-8 gap-1.5 text-xs font-medium shrink-0'
							>
								<ThumbsUp className={`h-3.5 w-3.5 ${q.hasVoted ? 'fill-current' : ''}`} />
								<span>Helpful</span>
								{q.helpfulCount > 0 && <span>({q.helpfulCount})</span>}
							</Button>
						</div>

						{/* Answers Section */}
						<div className='mt-4 pl-9 space-y-3'>
							{q.answers.length > 0 ? (
								q.answers.map((ans) => (
									<div
										key={ans.id}
										className='rounded-lg bg-muted/40 p-3.5 text-sm border border-muted/60 space-y-2'
									>
										<p className='text-foreground leading-relaxed font-normal whitespace-pre-line'>
											{ans.answer}
										</p>
										<div className='flex items-center justify-between text-xs pt-1 border-t border-border/40'>
											<div className='flex items-center gap-2 flex-wrap'>
												<span className='font-medium text-foreground'>
													{ans.user?.name || 'Community Member'}
												</span>
												{ans.isOfficialSeller && (
													<Badge
														variant='outline'
														className='gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold py-0 h-4'
													>
														<CheckCircle2 className='h-2.5 w-2.5' />
														Official Seller
													</Badge>
												)}
												{ans.isVerifiedBuyer && (
													<Badge
														variant='outline'
														className='gap-1 border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400 text-[10px] font-medium py-0 h-4'
													>
														<ShoppingBag className='h-2.5 w-2.5' />
														Verified Buyer
													</Badge>
												)}
												<span className='text-muted-foreground'>
													• {new Date(ans.createdAt).toLocaleDateString()}
												</span>
											</div>

											{/* Answer Helpful Button */}
											<button
												type='button'
												onClick={() => handleAnswerVote(ans.id)}
												aria-label='Mark answer helpful'
												className={`flex items-center gap-1 text-xs transition-colors hover:text-primary ${
													ans.hasVoted
														? 'text-primary font-semibold'
														: 'text-muted-foreground'
												}`}
											>
												<ThumbsUp
													className={`h-3 w-3 ${ans.hasVoted ? 'fill-current' : ''}`}
												/>
												<span>{ans.helpfulCount > 0 ? ans.helpfulCount : 'Helpful'}</span>
											</button>
										</div>
									</div>
								))
							) : (
								<p className='text-xs text-muted-foreground italic'>
									No answers yet. Can you help?
								</p>
							)}

							{/* Reply Form */}
							{replyingToId === q.id ? (
								<div className='mt-3 space-y-2 rounded-lg border bg-background p-3'>
									<Textarea
										placeholder='Write your answer based on your experience...'
										value={replyText}
										onChange={(e) => setReplyText(e.target.value)}
										rows={3}
										maxLength={1000}
										className='resize-none text-xs'
									/>
									<div className='flex items-center justify-between'>
										<span className='text-[11px] text-muted-foreground'>
											{replyText.length}/1000
										</span>
										<div className='flex items-center gap-2'>
											<Button
												variant='ghost'
												size='sm'
												onClick={() => {
													setReplyingToId(null);
													setReplyText('');
												}}
												disabled={answerMutation.isPending}
												className='h-7 text-xs'
											>
												Cancel
											</Button>
											<Button
												size='sm'
												onClick={() =>
													answerMutation.mutate({
														questionId: q.id,
														text: replyText,
													})
												}
												disabled={
													answerMutation.isPending || replyText.trim().length < 2
												}
												className='h-7 gap-1.5 text-xs'
											>
												{answerMutation.isPending ? (
													<Loader2 className='h-3 w-3 animate-spin' />
												) : (
													<Send className='h-3 w-3' />
												)}
												Post Answer
											</Button>
										</div>
									</div>
								</div>
							) : canAnswer ? (
								<Button
									variant='ghost'
									size='sm'
									onClick={() => {
										setReplyingToId(q.id);
										setReplyText('');
									}}
									className='h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground pl-0'
								>
									<MessageSquare className='h-3.5 w-3.5' />
									Answer this question
								</Button>
							) : (
								<Button
									variant='ghost'
									size='sm'
									disabled={true}
									title='Only the store seller or an admin can answer questions'
									className='h-7 gap-1.5 text-xs text-muted-foreground/60 cursor-not-allowed pl-0'
								>
									<MessageSquare className='h-3.5 w-3.5' />
									Only the seller can answer
								</Button>
							)}
						</div>
					</article>
				))}

				{/* Legacy FAQ Accordion Section */}
				{filteredLegacy.length > 0 && (
					<div className='rounded-xl border bg-card/60 p-5 mt-6'>
						<button
							type='button'
							onClick={() => setIsLegacyExpanded(!isLegacyExpanded)}
							className='flex w-full items-center justify-between text-left font-semibold text-foreground text-sm'
						>
							<span className='flex items-center gap-2'>
								<HelpCircle className='h-4 w-4 text-primary' />
								Frequently Asked Questions ({filteredLegacy.length})
							</span>
							{isLegacyExpanded ? (
								<ChevronUp className='h-4 w-4 text-muted-foreground' />
							) : (
								<ChevronDown className='h-4 w-4 text-muted-foreground' />
							)}
						</button>

						{isLegacyExpanded && (
							<ul className='mt-4 space-y-4 divide-y divide-border/40'>
								{filteredLegacy.map((faq, i) => (
									<li key={i} className={i > 0 ? 'pt-4' : ''}>
										<p className='text-sm font-semibold text-foreground flex items-center gap-2'>
											<MessageCircleQuestion className='h-4 w-4 text-muted-foreground shrink-0' />
											{faq.question}
										</p>
										<p className='mt-1.5 pl-6 text-sm text-muted-foreground leading-relaxed'>
											{faq.answer}
										</p>
									</li>
								))}
							</ul>
						)}
					</div>
				)}

				{/* Empty State */}
				{!isLoading && dynamicQuestions.length === 0 && filteredLegacy.length === 0 && (
					<div className='rounded-xl border border-dashed py-12 px-4 text-center'>
						<MessageCircleQuestion className='mx-auto h-10 w-10 text-muted-foreground/60' />
						<h3 className='mt-3 text-base font-semibold text-foreground'>
							No questions found
						</h3>
						<p className='mt-1 text-sm text-muted-foreground max-w-sm mx-auto'>
							{searchQuery.trim()
								? 'No questions matched your search criteria. Try a different term or ask a new question.'
								: 'Be the first to ask a question about this product!'}
						</p>
					</div>
				)}
			</div>
		</section>
	);
};

export default ProductQuestions;
