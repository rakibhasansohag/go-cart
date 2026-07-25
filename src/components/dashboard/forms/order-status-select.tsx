'use client';

import OrderStatusTag from '@/components/shared/order-status';
import { OrderStatus } from '@/lib/types';
import { updateOrderGroupStatus } from '@/queries/order';
import { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface Props {
	storeId: string;
	groupId: string;
	status: OrderStatus;
	storeUrl?: string;
}

const OrderStatusSelect: FC<Props> = ({ groupId, status, storeId, storeUrl }) => {
	const [newStatus, setNewStatus] = useState<OrderStatus>(status);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
	const [mounted, setMounted] = useState<boolean>(false);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const queryClient = useQueryClient();

	useEffect(() => {
		setMounted(true);
	}, []);

	// Capture phase outside-click & window scroll handler
	useEffect(() => {
		if (!isOpen) return;

		const handlePointerDown = (e: MouseEvent | TouchEvent) => {
			const target = e.target as Node;
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(target) &&
				buttonRef.current &&
				!buttonRef.current.contains(target)
			) {
				setIsOpen(false);
			}
		};

		const handleScroll = (e: Event) => {
			const target = e.target as Node;
			if (dropdownRef.current && !dropdownRef.current.contains(target)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handlePointerDown, true);
		document.addEventListener('touchstart', handlePointerDown, true);
		window.addEventListener('scroll', handleScroll, true);

		return () => {
			document.removeEventListener('mousedown', handlePointerDown, true);
			document.removeEventListener('touchstart', handlePointerDown, true);
			window.removeEventListener('scroll', handleScroll, true);
		};
	}, [isOpen]);

	// Native wheel listener on the dropdown container to bypass Radix Dialog body scroll lock
	useEffect(() => {
		if (!isOpen || !dropdownRef.current) return;
		const el = dropdownRef.current;

		const handleWheel = (e: WheelEvent) => {
			e.stopPropagation();
			e.preventDefault();
			el.scrollTop += e.deltaY;
		};

		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => {
			el.removeEventListener('wheel', handleWheel);
		};
	}, [isOpen, coords]);

	const statusMutation = useMutation({
		mutationFn: (selectedStatus: OrderStatus) =>
			updateOrderGroupStatus(storeId, groupId, selectedStatus),
		onSuccess: (response, selectedStatus) => {
			if (response) {
				setNewStatus(selectedStatus);
				toast.success(`Order status ${selectedStatus} has been updated.`);
				setIsOpen(false);
				if (storeUrl) {
					queryClient.invalidateQueries({
						queryKey: queryKeys.dashboard.orders(storeUrl),
					});
				}
			}
		},
		onError: (error: unknown) => {
			toast.error(error instanceof Error ? error.message : String(error));
		},
	});

	const options = Object.values(OrderStatus).filter((s) => s !== newStatus);

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!isOpen && buttonRef.current) {
			const rect = buttonRef.current.getBoundingClientRect();
			const dropdownHeight = 220;
			const spaceBelow = window.innerHeight - rect.bottom;

			let top = rect.bottom + 6;
			if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
				top = rect.top - dropdownHeight;
			}

			let left = rect.left;
			if (left + 195 > window.innerWidth) {
				left = window.innerWidth - 200;
			}

			setCoords({ top, left });
		}
		setIsOpen((prev) => !prev);
	};

	const handleClick = (selectedStatus: OrderStatus) => {
		statusMutation.mutate(selectedStatus);
	};

	return (
		<div className='relative inline-block text-left'>
			{/* Trigger Button */}
			<button
				ref={buttonRef}
				type='button'
				onClick={handleToggle}
				className='cursor-pointer outline-none border-none p-0 bg-transparent flex items-center gap-1 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95'
			>
				<OrderStatusTag status={newStatus} />
			</button>

			{/* Portal Dropdown directly onto document.body */}
			{isOpen && mounted && coords && createPortal(
				<div
					ref={dropdownRef}
					style={{
						position: 'fixed',
						top: `${coords.top}px`,
						left: `${coords.left}px`,
					}}
					className='z-[99999] w-48 max-h-56 overflow-y-auto bg-popover border border-border/80 shadow-2xl rounded-xl p-1.5 space-y-1 backdrop-blur-md animate-in fade-in-50 zoom-in-95 pointer-events-auto touch-pan-y'
				>
					{options.map((option) => (
						<button
							key={option}
							type='button'
							disabled={statusMutation.isPending}
							onClick={(e) => {
								e.stopPropagation();
								handleClick(option);
							}}
							className='w-full flex items-center p-1.5 rounded-lg hover:bg-accent hover:translate-x-0.5 active:scale-98 transition-all duration-150 cursor-pointer text-left font-medium'
						>
							<OrderStatusTag status={option} />
						</button>
					))}
				</div>,
				document.body,
			)}
		</div>
	);
};

export default OrderStatusSelect;
