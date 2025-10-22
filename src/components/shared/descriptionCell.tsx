import React, { useState } from 'react';
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const DescriptionCell: React.FC<{ html?: string; title?: string }> = ({
	html = '',
	title,
}) => {
	const [open, setOpen] = useState(false);

	// plain-text preview
	const textPreview = (html || '').replace(/<[^>]*>?/gm, '');

	return (
		<>
			<HoverCard>
				<HoverCardTrigger asChild>
					<button
						type='button'
						onClick={() => setOpen(true)}
						className='text-sm text-muted-foreground text-left line-clamp-3 max-w-[8rem] overflow-hidden text-ellipsis break-words hover:underline'
						aria-label='Open full description'
					>
						{textPreview || '—'}
					</button>
				</HoverCardTrigger>

				<HoverCardContent className='max-w-[34rem]'>
					<div className='text-sm leading-relaxed'>
						<div dangerouslySetInnerHTML={{ __html: html || '' }} />
					</div>
				</HoverCardContent>
			</HoverCard>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className='max-w-4xl'>
					<DialogHeader>
						<DialogTitle>
							{title ? `${title} — Description` : 'Description'}
						</DialogTitle>
					</DialogHeader>

					<div className='mt-2 prose max-w-none'>
						<div dangerouslySetInnerHTML={{ __html: html || '' }} />
					</div>

					<div className='mt-4 flex justify-end'>
						<Button variant='outline' onClick={() => setOpen(false)}>
							Close
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default DescriptionCell;
