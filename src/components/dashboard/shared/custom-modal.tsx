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
		<Dialog open={isOpen || defaultOpen} onOpenChange={setClose}>
			<DialogContent
				ref={contentRef}
				onOpenAutoFocus={(e) => e.preventDefault()}
				aria-description='Modal content'
				className={cn(
					'overflow-y-scroll md:max-h-[85vh] md:h-fit h-screen bg-card z-[999] p-4 sm:p-6',
					maxWidth || 'w-[95vw] max-w-7xl sm:max-w-5xl lg:max-w-7xl',
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
