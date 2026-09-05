'use client';

import React, { FC } from 'react';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Zap, ChevronUp } from 'lucide-react';

interface Props {
	onSelectReply: (text: string) => void;
}

const TEMPLATES: Array<{ label: string; text: string }> = [
	{
		label: 'In Stock & Ready',
		text: 'Hello! Yes, this item is currently in stock and ready for immediate shipping.',
	},
	{
		label: 'Delivery Times',
		text: 'Standard delivery takes 2 to 4 business days. Once dispatched, you will receive real-time package tracking.',
	},
	{
		label: 'Order Processing',
		text: 'Your order has been confirmed and is currently being prepared for handover to logistics.',
	},
	{
		label: 'Return / Warranty',
		text: 'Our store offers a 7-day hassle-free return window on verified orders. Please feel free to request a return if needed.',
	},
	{
		label: 'Thank You',
		text: 'Thank you for reaching out to us! Please let us know if you have any further questions.',
	},
];

export const SellerQuickReplies: FC<Props> = ({ onSelectReply }) => {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					className='h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground font-medium'
				>
					<Zap className='w-3 h-3 text-amber-500' />
					<span>Quick Replies</span>
					<ChevronUp className='w-3 h-3 opacity-60' />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				side='top'
				align='start'
				className='w-80 p-2 space-y-1 text-xs'
			>
				<p className='text-[11px] font-semibold text-muted-foreground px-2 py-1'>
					Select a response template:
				</p>
				{TEMPLATES.map((item, idx) => (
					<button
						key={idx}
						type='button'
						onClick={() => onSelectReply(item.text)}
						className='w-full text-left p-2 rounded-md hover:bg-muted transition-colors'
					>
						<p className='font-semibold text-foreground text-xs'>{item.label}</p>
						<p className='text-[11px] text-muted-foreground line-clamp-1 mt-0.5'>
							{item.text}
						</p>
					</button>
				))}
			</PopoverContent>
		</Popover>
	);
};

export default SellerQuickReplies;
