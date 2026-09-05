'use client';

import React, { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2, Store, Package } from 'lucide-react';
import { startConversation } from '@/queries/messages';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Props {
	storeId: string;
	storeName: string;
	storeUrl?: string;
	productId?: string;
	productName?: string;
	orderId?: string;
	orderGroupId?: string;
	orderReference?: string;
	trigger?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export const ContactSellerDialog: FC<Props> = ({
	storeId,
	storeName,
	productId,
	productName,
	orderId,
	orderGroupId,
	orderReference,
	trigger,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
}) => {
	const router = useRouter();
	const { isSignedIn } = useUser();
	const { openSignIn } = useClerk();
	const queryClient = useQueryClient();

	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : uncontrolledOpen;
	const setOpen = isControlled ? setControlledOpen! : setUncontrolledOpen;

	const defaultSubject = productName
		? `Question about ${productName}`
		: orderReference
		? `Inquiry regarding Order ${orderReference}`
		: `Inquiry for ${storeName}`;

	const [subject, setSubject] = useState(defaultSubject);
	const [message, setMessage] = useState('');

	useEffect(() => {
		if (open) {
			setSubject(defaultSubject);
		}
	}, [open, defaultSubject]);

	const mutation = useMutation({
		mutationFn: async () => {
			const res = await startConversation({
				storeId,
				subject: subject.trim() || undefined,
				message: message.trim(),
				productId,
				orderId,
				orderGroupId,
			});
			if (!res.success) {
				throw new Error(res.error || 'Failed to send message.');
			}
			return res;
		},
		onSuccess: (data) => {
			toast.success('Your message has been sent to the seller!', {
				action: {
					label: 'View Messages',
					onClick: () =>
						router.push(
							data.conversationId
								? `/profile/messages?conversationId=${data.conversationId}`
								: '/profile/messages'
						),
				},
			});
			setMessage('');
			setOpen(false);
			queryClient.invalidateQueries({ queryKey: ['buyer-conversations'] });
			if (data.conversationId) {
				router.push(`/profile/messages?conversationId=${data.conversationId}`);
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Could not send message.');
		},
	});

	const handleOpenClick = () => {
		if (!isSignedIn) {
			toast.info('Please sign in to contact the store.', {
				action: {
					label: 'Sign In',
					onClick: () => openSignIn?.(),
				},
			});
			return;
		}
		setOpen(true);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger ? (
				<div onClick={handleOpenClick} className='inline-flex'>
					{trigger}
				</div>
			) : (
				<DialogTrigger asChild>
					<Button
						variant='outline'
						size='sm'
						onClick={handleOpenClick}
						className='gap-2 text-xs font-medium'
					>
						<MessageSquare className='w-3.5 h-3.5' />
						Contact Seller
					</Button>
				</DialogTrigger>
			)}

			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<MessageSquare className='w-4 h-4 text-primary' />
						Contact {storeName}
					</DialogTitle>
					<DialogDescription>
						Send a direct message to the seller. You will receive replies in your messages inbox.
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4 py-2 text-xs'>
					{/* Context Snippet */}
					{(productName || orderReference) && (
						<div className='rounded-lg bg-muted/50 p-2.5 border flex items-center gap-2 text-muted-foreground'>
							{productName ? (
								<>
									<Store className='w-4 h-4 text-primary shrink-0' />
									<span className='truncate'>
										Product: <strong className='text-foreground'>{productName}</strong>
									</span>
								</>
							) : (
								<>
									<Package className='w-4 h-4 text-primary shrink-0' />
									<span className='truncate'>
										Order: <strong className='text-foreground'>{orderReference}</strong>
									</span>
								</>
							)}
						</div>
					)}

					{/* Subject Input */}
					<div className='space-y-1.5'>
						<label className='font-semibold text-foreground'>Subject (Optional)</label>
						<Input
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
							placeholder='e.g. Dimensions, stock, or delivery inquiry'
							maxLength={120}
							className='h-9 text-xs'
						/>
					</div>

					{/* Message Textarea */}
					<div className='space-y-1.5'>
						<label className='font-semibold text-foreground'>Message</label>
						<Textarea
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder='Write your message here...'
							rows={5}
							maxLength={2000}
							className='resize-none text-xs leading-relaxed'
						/>
						<div className='flex justify-between items-center text-[11px] text-muted-foreground'>
							<span>Min 2 characters</span>
							<span>{message.length}/2000</span>
						</div>
					</div>
				</div>

				<DialogFooter className='flex flex-row justify-end items-center gap-3 pt-2'>
					<Button
						variant='outline'
						onClick={() => setOpen(false)}
						disabled={mutation.isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={() => mutation.mutate()}
						disabled={mutation.isPending || message.trim().length < 2}
						className='gap-2'
					>
						{mutation.isPending ? (
							<Loader2 className='w-4 h-4 animate-spin' />
						) : (
							<Send className='w-4 h-4' />
						)}
						Send Inquiry
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ContactSellerDialog;
