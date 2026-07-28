'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
	const { isOpen, getIsDirty, setClose } = useModal();
	const [showConfirm, setShowConfirm] = useState(false);
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

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			if (getIsDirty()) {
				setShowConfirm(true);
			} else {
				setClose(true);
			}
		}
	};

	return (
		<>
			<Dialog open={Boolean(isOpen || defaultOpen)} onOpenChange={handleOpenChange}>
				<DialogContent
					ref={contentRef}
					onOpenAutoFocus={(e) => e.preventDefault()}
					onPointerDownOutside={(e) => {
						if (getIsDirty()) {
							e.preventDefault();
							setShowConfirm(true);
						}
					}}
					onEscapeKeyDown={(e) => {
						if (getIsDirty()) {
							e.preventDefault();
							setShowConfirm(true);
						}
					}}
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

			{showConfirm &&
				typeof window !== 'undefined' &&
				createPortal(
					<div
						tabIndex={-1}
						className='fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200 pointer-events-auto'
						onClick={(e) => {
							e.stopPropagation();
						}}
					>
						<div
							className='relative w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 text-foreground z-[1000000] pointer-events-auto'
							onClick={(e) => e.stopPropagation()}
						>
							<div className='space-y-2 text-left'>
								<h3 className='text-lg font-bold tracking-tight text-foreground'>
									Discard Unsaved Changes?
								</h3>
								<p className='text-sm text-muted-foreground leading-relaxed'>
									You have unsaved changes in this form. Are you sure you want to
									close without saving?
								</p>
							</div>

							<div className='flex items-center justify-end gap-3 pt-2'>
								<button
									type='button'
									onClick={(e) => {
										e.stopPropagation();
										setShowConfirm(false);
									}}
									className='px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-accent text-foreground transition-colors cursor-pointer pointer-events-auto'
								>
									Keep Editing
								</button>

								<button
									type='button'
									onClick={(e) => {
										e.stopPropagation();
										setShowConfirm(false);
										setClose(true);
									}}
									className='px-4 py-2 text-sm font-semibold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-sm cursor-pointer pointer-events-auto'
								>
									Discard & Close
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</>
	);
};

export default CustomModal;
