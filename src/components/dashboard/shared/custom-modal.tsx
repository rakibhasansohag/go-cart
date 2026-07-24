'use client';

import { useEffect, useRef } from 'react';
// Provider
import { useModal } from '@/providers/modal-provider';

// UI components
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Props = {
	heading?: string;
	subheading?: string;
	children: React.ReactNode;
	defaultOpen?: boolean;
	maxWidth?: string;
};

const CustomModal = ({
	children,
	defaultOpen,
	subheading,
	heading,
	maxWidth,
}: Props) => {
	const { isOpen, setClose } = useModal();
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen || defaultOpen) {
			const timer = setTimeout(() => {
				if (contentRef.current) {
					contentRef.current.scrollTop = 0;
				}
			}, 0);
			return () => clearTimeout(timer);
		}
	}, [isOpen, defaultOpen]);

	return (
		<Dialog open={isOpen || defaultOpen} onOpenChange={setClose} modal={false}>
			<DialogContent
				ref={contentRef}
				onOpenAutoFocus={(e) => e.preventDefault()}
				aria-description='Modal content'
				className={cn(
					'overflow-y-scroll md:max-h-[700px] md:h-fit h-screen bg-card z-[999]',
					maxWidth,
				)}
			>
				<DialogTitle className='text-2xl font-bold'>{heading}</DialogTitle>

				<DialogHeader className='pt-8 text-left'>
					{subheading && <DialogDescription>{subheading}</DialogDescription>}

					{children}
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
};

export default CustomModal;
