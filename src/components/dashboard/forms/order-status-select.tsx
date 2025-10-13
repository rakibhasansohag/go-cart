import OrderStatusTag from '@/components/shared/order-status';
import { OrderStatus } from '@/lib/types';
import { updateOrderGroupStatus } from '@/queries/order';
import { FC, useState } from 'react';
import { toast } from 'sonner';

interface Props {
	storeId: string;
	groupId: string;
	status: OrderStatus;
}

const OrderStatusSelect: FC<Props> = ({ groupId, status, storeId }) => {
	const [newStatus, setNewStatus] = useState<OrderStatus>(status);
	const [isOpen, setIsOpen] = useState<boolean>(false);

	// Options
	const options = Object.values(OrderStatus).filter((s) => s !== newStatus);

	// Handle click
	const handleClick = async (selectedStatus: OrderStatus) => {
		try {
			const response = await updateOrderGroupStatus(
				storeId,
				groupId,
				selectedStatus,
			);
			if (response) {
				setNewStatus(response as OrderStatus);
				toast.success(`Order status ${selectedStatus} has been updated.`);
				setIsOpen(false);
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			toast.error(error.toString());
		}
	};
	return (
		<div className='relative'>
			{/* Current status */}
			<div
				className='cursor-pointer'
				onClick={() => setIsOpen((prev) => !prev)}
			>
				<OrderStatusTag status={newStatus} />
			</div>
			{/* Dropdown */}
			{isOpen && (
				<div className='absolute z-50 bg-background border border-gray-200 dark:border-gray-700 rounded-md shadow-md mt-2 w-[140px]'>
					{options.map((option) => (
						<button
							key={option}
							className='w-full flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer'
							onClick={() => handleClick(option)}
						>
							<OrderStatusTag status={option} />
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default OrderStatusSelect;
