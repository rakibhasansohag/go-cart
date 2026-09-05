'use client';

import React, { FC, useState, useEffect, useRef, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
	Search,
	MessageSquare,
	Send,
	Store,
	Package,
	CheckCircle2,
	Clock,
	RotateCcw,
	Loader2,
	AlertCircle,
	ArrowLeft,
	ExternalLink,
	ShoppingBag,
	Tag,
} from 'lucide-react';
import InChatProductCard from '@/components/store/messages/in-chat-product-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	ConversationListItem,
	ConversationListResponse,
	ConversationDetail,
	getBuyerConversations,
	getConversationDetails,
	sendReplyMessage,
	updateConversationStatus,
} from '@/queries/messages';
import { ConversationStatus, MessageSenderRole } from '@prisma/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatMessageSnippet } from '@/lib/utils';

interface Props {
	initialData: ConversationListResponse;
	initialConversationId?: string;
}

export default function BuyerMessagesView({
	initialData,
	initialConversationId,
}: Props) {
	const searchParams = useSearchParams();
	const queryConversationId =
		searchParams.get('conversationId') || initialConversationId || null;

	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState<'all' | 'open' | 'resolved'>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedId, setSelectedId] = useState<string | null>(
		queryConversationId ?? initialData.conversations[0]?.id ?? null
	);
	const [replyText, setReplyText] = useState('');
	const [isPending, startTransition] = useTransition();
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Sync selectedId when notification link or URL search param changes
	useEffect(() => {
		const paramId = searchParams.get('conversationId');
		if (paramId) {
			setSelectedId(paramId);
		}
	}, [searchParams]);

	// Conversations list query with 3-second live polling
	const { data: listData } = useQuery({
		queryKey: ['buyer-conversations', activeTab, searchQuery],
		queryFn: () =>
			getBuyerConversations({
				filter: activeTab,
				search: searchQuery,
			}),
		initialData: activeTab === 'all' && !searchQuery ? initialData : undefined,
		refetchInterval: 3000, // 3 seconds snappy live polling
	});

	const conversations = listData?.conversations ?? initialData.conversations;
	const counts = listData?.counts ?? initialData.counts;

	// Automatically select the first conversation if none selected
	useEffect(() => {
		if (!selectedId && conversations.length > 0) {
			setSelectedId(conversations[0].id);
		}
	}, [conversations, selectedId]);

	// Active conversation details query with 3-second live polling
	const { data: activeDetailData, isLoading: isLoadingDetails } = useQuery({
		queryKey: ['conversation-detail', selectedId],
		queryFn: () => (selectedId ? getConversationDetails(selectedId) : null),
		enabled: Boolean(selectedId),
		refetchInterval: 3000, // 3 seconds snappy live polling
	});

	const activeConv = activeDetailData?.conversation;

	// Scroll to bottom when messages update
	useEffect(() => {
		if (activeConv?.messages) {
			messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
		}
	}, [activeConv?.messages?.length]);

	// Send reply mutation
	const sendReplyMutation = useMutation({
		mutationFn: async (text: string) => {
			if (!selectedId) throw new Error('No conversation selected.');
			const res = await sendReplyMessage({
				conversationId: selectedId,
				message: text.trim(),
			});
			if (!res.success) throw new Error(res.error || 'Failed to send message.');
			return res.message;
		},
		onSuccess: () => {
			setReplyText('');
			queryClient.invalidateQueries({ queryKey: ['conversation-detail', selectedId] });
			queryClient.invalidateQueries({ queryKey: ['buyer-conversations'] });
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Could not send message.');
		},
	});

	const handleStatusToggle = async () => {
		if (!activeConv) return;
		const nextStatus =
			activeConv.status === ConversationStatus.RESOLVED
				? ConversationStatus.OPEN
				: ConversationStatus.RESOLVED;

		startTransition(async () => {
			const res = await updateConversationStatus(activeConv.id, nextStatus);
			if (res.success) {
				toast.success(
					nextStatus === ConversationStatus.RESOLVED
						? 'Conversation marked as resolved.'
						: 'Conversation reopened.'
				);
				queryClient.invalidateQueries({ queryKey: ['conversation-detail', activeConv.id] });
				queryClient.invalidateQueries({ queryKey: ['buyer-conversations'] });
			} else {
				toast.error(res.error || 'Failed to update status.');
			}
		});
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (replyText.trim().length >= 1 && !sendReplyMutation.isPending) {
				sendReplyMutation.mutate(replyText);
			}
		}
	};

	return (
		<div className='rounded-2xl border bg-card/70 shadow-xs overflow-hidden h-[750px] flex flex-col'>
			{/* Top Header */}
			<div className='p-4 border-b flex items-center justify-between bg-muted/20'>
				<div>
					<h1 className='text-lg font-bold text-foreground flex items-center gap-2'>
						<MessageSquare className='w-5 h-5 text-primary' />
						Messages & Store Inquiries
					</h1>
					<p className='text-xs text-muted-foreground'>
						Direct private communication with store owners regarding your products and orders.
					</p>
				</div>
			</div>

			{/* Main Split Body */}
			<div className='flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden'>
				{/* Left Sidebar: Conversations List */}
				<div className='w-full md:w-80 border-r flex flex-col bg-background/50'>
					{/* Search & Tabs */}
					<div className='p-3 border-b space-y-2.5'>
						<div className='relative'>
							<Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground' />
							<Input
								placeholder='Search messages...'
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className='pl-8 h-8 text-xs bg-muted/40'
							/>
						</div>
						<div className='flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg text-xs'>
							<button
								type='button'
								onClick={() => setActiveTab('all')}
								className={`flex-1 py-1 rounded-md font-medium text-[11px] transition-colors ${activeTab === 'all'
									? 'bg-background text-foreground shadow-xs'
									: 'text-muted-foreground hover:text-foreground'
									}`}
							>
								All ({counts.all})
							</button>
							<button
								type='button'
								onClick={() => setActiveTab('open')}
								className={`flex-1 py-1 rounded-md font-medium text-[11px] transition-colors ${activeTab === 'open'
									? 'bg-background text-foreground shadow-xs'
									: 'text-muted-foreground hover:text-foreground'
									}`}
							>
								Open ({counts.open})
							</button>
							<button
								type='button'
								onClick={() => setActiveTab('resolved')}
								className={`flex-1 py-1 rounded-md font-medium text-[11px] transition-colors ${activeTab === 'resolved'
									? 'bg-background text-foreground shadow-xs'
									: 'text-muted-foreground hover:text-foreground'
									}`}
							>
								Resolved ({counts.resolved})
							</button>
						</div>
					</div>

					{/* Conversations Scroll List */}
					<div className='flex-1 overflow-y-auto divide-y divide-border/40'>
						{conversations.length === 0 ? (
							<div className='p-6 text-center text-xs text-muted-foreground space-y-1.5'>
								<MessageSquare className='w-6 h-6 mx-auto text-muted-foreground/40' />
								<p className='font-medium text-foreground'>No conversations found</p>
								<p className='text-[11px]'>
									{searchQuery
										? 'No messages matched your search query.'
										: 'You have not sent any inquiries to sellers yet.'}
								</p>
							</div>
						) : (
							conversations.map((c) => {
								const isSelected = c.id === selectedId;
								return (
									<button
										key={c.id}
										type='button'
										onClick={() => setSelectedId(c.id)}
										className={`w-full text-left p-3 transition-colors flex items-start gap-2.5 ${isSelected
											? 'bg-primary/10 border-l-2 border-primary'
											: 'hover:bg-muted/40'
											}`}
									>
										<Avatar className='h-9 w-9 shrink-0 border mt-0.5'>
											<AvatarImage src={c.store.logo} />
											<AvatarFallback className='text-[10px] font-bold uppercase bg-primary/10 text-primary'>
												{c.store.name.slice(0, 2)}
											</AvatarFallback>
										</Avatar>
										<div className='flex-1 min-w-0 space-y-0.5'>
											<div className='flex items-center justify-between gap-1'>
												<span className='font-semibold text-xs text-foreground truncate'>
													{c.store.name}
												</span>
												<span className='text-[10px] text-muted-foreground shrink-0'>
													{new Date(c.lastMessageAt).toLocaleDateString([], {
														month: 'numeric',
														day: 'numeric',
													})}
												</span>
											</div>
											<p className='text-[11px] font-medium text-foreground/80 truncate'>
												{c.subject || 'General Inquiry'}
											</p>
											<div className='flex items-center justify-between gap-1 pt-0.5'>
												<p className='text-[11px] text-muted-foreground truncate flex-1'>
													{formatMessageSnippet(c.lastMessageSnippet)}
												</p>
												{c.unreadCount > 0 && (
													<span className='w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0'>
														{c.unreadCount}
													</span>
												)}
												{c.status === ConversationStatus.RESOLVED && (
													<Badge
														variant='outline'
														className='text-[9px] py-0 h-3.5 px-1 bg-muted/60 text-muted-foreground'
													>
														Resolved
													</Badge>
												)}
											</div>
										</div>
									</button>
								);
							})
						)}
					</div>
				</div>

				{/* Right Pane: Active Thread Chat View */}
				<div className='flex-1 flex flex-col bg-card/30 min-h-0'>
					{activeConv ? (
						<>
							{/* Thread Header */}
							<div className='p-3.5 border-b bg-background/80 flex items-center justify-between gap-3'>
								<div className='flex items-center gap-2.5 min-w-0'>
									<Avatar className='h-8 w-8 shrink-0 border'>
										<AvatarImage src={activeConv.store.logo} />
										<AvatarFallback className='text-[10px] font-bold uppercase'>
											{activeConv.store.name.slice(0, 2)}
										</AvatarFallback>
									</Avatar>
									<div className='min-w-0'>
										<div className='flex items-center gap-1.5'>
											<span className='font-semibold text-xs text-foreground truncate'>
												{activeConv.store.name}
											</span>
											<Link
												href={`/store/${activeConv.store.url}`}
												target='_blank'
												className='text-muted-foreground hover:text-primary'
												title='Visit store page'
											>
												<ExternalLink className='w-3 h-3' />
											</Link>
										</div>
										<p className='text-[11px] text-muted-foreground truncate'>
											{activeConv.subject || 'Direct Inquiry'}
										</p>
									</div>
								</div>

								<div className='flex items-center gap-2 shrink-0'>
									{activeConv.status === ConversationStatus.RESOLVED ? (
										<Badge
											variant='outline'
											className='gap-1 border-muted bg-muted text-muted-foreground text-[10px]'
										>
											<CheckCircle2 className='w-2.5 h-2.5' />
											Resolved
										</Badge>
									) : (
										<Badge
											variant='outline'
											className='gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]'
										>
											<Clock className='w-2.5 h-2.5' />
											Open
										</Badge>
									)}

									<Button
										variant='ghost'
										size='sm'
										onClick={handleStatusToggle}
										disabled={isPending}
										className='h-7 text-xs gap-1.5'
									>
										{activeConv.status === ConversationStatus.RESOLVED ? (
											<>
												<RotateCcw className='w-3 h-3' />
												Reopen
											</>
										) : (
											<>
												<CheckCircle2 className='w-3 h-3' />
												Mark Resolved
											</>
										)}
									</Button>
								</div>
							</div>

							{/* Inquired Product / Order Hero Card */}
							{(activeConv.product || activeConv.order) && (
								<div className='p-3 bg-muted/30 border-b flex flex-wrap items-center justify-between gap-3 text-xs'>
									{activeConv.product && (
										<div className='flex items-center gap-3 min-w-0'>
											<div className='relative w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/40 shadow-xs'>
												{activeConv.product.image ? (
													<Image
														src={activeConv.product.image}
														alt={activeConv.product.name}
														fill
														className='object-cover'
													/>
												) : (
													<div className='w-full h-full flex items-center justify-center text-muted-foreground'>
														<Package className='w-5 h-5' />
													</div>
												)}
											</div>
											<div className='min-w-0'>
												<div className='flex items-center gap-1.5'>
													<Badge
														variant='outline'
														className='text-[10px] py-0 h-4 px-1.5 font-medium border-primary/30 bg-primary/10 text-primary'
													>
														Inquired Product
													</Badge>
													{activeConv.product.price != null && (
														<span className='font-bold text-xs text-foreground'>
															${Number(activeConv.product.price).toFixed(2)}
														</span>
													)}
												</div>
												<p className='font-semibold text-xs text-foreground truncate mt-0.5 max-w-xs sm:max-w-sm'>
													{activeConv.product.name}
												</p>
											</div>
											<Button
												asChild
												size='sm'
												variant='outline'
												className='h-7 text-xs px-2.5 gap-1 shrink-0 ml-auto'
											>
												<Link
													href={`/product/${activeConv.product.slug}`}
													target='_blank'
													rel='noopener noreferrer'
												>
													<span>View Product</span>
													<ExternalLink className='w-3 h-3' />
												</Link>
											</Button>
										</div>
									)}

									{activeConv.order && (
										<div className='flex items-center gap-3 min-w-0 ml-auto'>
											<div className='flex items-center gap-2 text-muted-foreground text-xs'>
												<Package className='w-4 h-4 text-primary shrink-0' />
												<span>
													Order <strong>#{activeConv.order.id.slice(0, 8)}</strong>
												</span>
												<span>(${activeConv.order.total.toFixed(2)})</span>
												<Badge variant='outline' className='text-[10px] py-0 h-4 px-1.5'>
													{activeConv.order.orderStatus}
												</Badge>
											</div>
											<Button
												asChild
												size='sm'
												variant='ghost'
												className='h-7 text-xs px-2 gap-1 text-primary hover:underline'
											>
												<Link
													href={`/profile/orders/${activeConv.order.id}`}
													target='_blank'
													rel='noopener noreferrer'
												>
													<span>Order Details</span>
													<ExternalLink className='w-3 h-3' />
												</Link>
											</Button>
										</div>
									)}
								</div>
							)}

							{/* Message Timeline */}
							<div className='flex-1 p-4 overflow-y-auto space-y-3.5'>
								{activeConv.messages.map((m) => {
									const isBuyer = m.senderRole === MessageSenderRole.BUYER;
									return (
										<div
											key={m.id}
											className={`flex gap-2.5 ${isBuyer ? 'justify-end' : 'justify-start'}`}
										>
											{!isBuyer && (
												<Avatar className='h-7 w-7 shrink-0 border border-border/40 mt-1 shadow-xs'>
													<AvatarImage src={activeConv.store.logo} />
													<AvatarFallback className='text-[10px] font-bold uppercase bg-primary/10 text-primary'>
														{activeConv.store.name.slice(0, 2)}
													</AvatarFallback>
												</Avatar>
											)}

											<div
												className={`flex flex-col ${
													isBuyer ? 'items-end' : 'items-start'
												} max-w-[85%] sm:max-w-[70%]`}
											>
												<div className='flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1 px-1'>
													<span className='font-medium text-foreground/80'>
														{isBuyer ? 'You' : activeConv.store.name}
													</span>
													{!isBuyer && (
														<Badge
															variant='outline'
															className='text-[9px] py-0 h-3.5 px-1 bg-primary/10 text-primary border-primary/20'
														>
															Seller
														</Badge>
													)}
													<span>•</span>
													<span>
														{new Date(m.createdAt).toLocaleTimeString([], {
															hour: '2-digit',
															minute: '2-digit',
														})}
													</span>
												</div>

												{m.body.startsWith('[PRODUCT_RECOMMENDATION') ? (
													<InChatProductCard
														rawText={m.body}
														isOutgoing={isBuyer}
														onSendReply={(text) => sendReplyMutation.mutate(text)}
													/>
												) : (
													<div
														className={`rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed break-words ${
															isBuyer
																? 'bg-blue-600 text-white rounded-tr-xs'
																: 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/60 rounded-tl-xs'
														}`}
													>
														{m.body}
													</div>
												)}
											</div>
										</div>
									);
								})}
								<div ref={messagesEndRef} />
							</div>

							{/* Bottom Reply Bar */}
							<div className='p-3 border-t bg-background/80'>
								<div className='relative flex items-end gap-2'>
									<Textarea
										placeholder='Type your message to the seller... (Press Enter to send)'
										value={replyText}
										onChange={(e) => setReplyText(e.target.value)}
										onKeyDown={handleKeyDown}
										rows={2}
										maxLength={2000}
										className='resize-none text-xs leading-relaxed pr-10'
									/>
									<Button
										size='sm'
										onClick={() => sendReplyMutation.mutate(replyText)}
										disabled={
											sendReplyMutation.isPending || replyText.trim().length < 1
										}
										className='h-9 w-9 p-0 shrink-0'
									>
										{sendReplyMutation.isPending ? (
											<Loader2 className='w-4 h-4 animate-spin' />
										) : (
											<Send className='w-4 h-4' />
										)}
									</Button>
								</div>
								<div className='flex justify-between items-center text-[10px] text-muted-foreground mt-1 px-1'>
									<span>Shift + Enter for new line</span>
									<span>{replyText.length}/2000</span>
								</div>
							</div>
						</>
					) : (
						<div className='flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground'>
							<MessageSquare className='w-10 h-10 mb-2 text-muted-foreground/30 stroke-1' />
							<p className='text-sm font-semibold text-foreground'>No conversation selected</p>
							<p className='text-xs'>
								Select a conversation on the left or contact a seller directly from a product page.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
