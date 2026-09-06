import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export function ChatThreadSkeleton({
	subtitle = 'Loading conversation history...',
}: {
	subtitle?: string;
}) {
	return (
		<div className='flex-1 flex flex-col h-full bg-card/30 min-h-0 animate-in fade-in duration-200'>
			{/* Thread Header Skeleton */}
			<div className='p-3.5 border-b bg-background/80 flex items-center justify-between gap-3'>
				<div className='flex items-center gap-2.5 min-w-0'>
					<Skeleton className='h-8 w-8 rounded-full shrink-0' />
					<div className='space-y-1.5'>
						<Skeleton className='h-3.5 w-32 rounded' />
						<Skeleton className='h-3 w-48 rounded' />
					</div>
				</div>
				<div className='flex items-center gap-2 shrink-0'>
					<Skeleton className='h-5 w-16 rounded-full' />
					<Skeleton className='h-7 w-20 rounded-md' />
				</div>
			</div>

			{/* Centered Loading Indicator Bar */}
			<div className='py-2 px-4 bg-muted/20 border-b border-border/40 flex items-center justify-center gap-2 text-[11px] text-muted-foreground'>
				<Loader2 className='w-3.5 h-3.5 animate-spin text-primary' />
				<span>{subtitle}</span>
			</div>

			{/* Chat Messages Body Skeleton */}
			<div className='flex-1 p-4 overflow-y-auto space-y-4'>
				{/* Incoming message bubble */}
				<div className='flex gap-2.5 items-end max-w-[75%]'>
					<Skeleton className='h-7 w-7 rounded-full shrink-0' />
					<div className='space-y-1'>
						<Skeleton className='h-12 w-52 rounded-2xl rounded-tl-xs' />
						<Skeleton className='h-2.5 w-12 rounded' />
					</div>
				</div>

				{/* Outgoing message bubble */}
				<div className='flex justify-end'>
					<div className='space-y-1 flex flex-col items-end max-w-[75%]'>
						<Skeleton className='h-14 w-64 rounded-2xl rounded-tr-xs bg-primary/20' />
						<Skeleton className='h-2.5 w-12 rounded' />
					</div>
				</div>

				{/* Incoming message bubble */}
				<div className='flex gap-2.5 items-end max-w-[75%]'>
					<Skeleton className='h-7 w-7 rounded-full shrink-0' />
					<div className='space-y-1'>
						<Skeleton className='h-10 w-44 rounded-2xl rounded-tl-xs' />
						<Skeleton className='h-2.5 w-12 rounded' />
					</div>
				</div>

				{/* Outgoing message bubble */}
				<div className='flex justify-end'>
					<div className='space-y-1 flex flex-col items-end max-w-[75%]'>
						<Skeleton className='h-10 w-48 rounded-2xl rounded-tr-xs bg-primary/20' />
						<Skeleton className='h-2.5 w-12 rounded' />
					</div>
				</div>
			</div>

			{/* Input Area Skeleton */}
			<div className='p-3 border-t bg-background/80 flex items-center gap-2'>
				<Skeleton className='h-10 flex-1 rounded-md' />
				<Skeleton className='h-9 w-9 rounded-md shrink-0' />
			</div>
		</div>
	);
}
