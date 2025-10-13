import ProductStatusTag from '@/components/shared/product-status';
import { ProductStatus } from '@/lib/types';
import { updateOrderItemStatus } from '@/queries/order';
import { useRouter } from 'next/navigation';
import { FC, useState } from 'react';
import { toast } from 'sonner';

interface Props {
	storeId: string;
	orderItemId: string;
	status: ProductStatus;
}

const ProductStatusSelect: FC<Props> = ({ orderItemId, status, storeId }) => {
	const [newStatus, setNewStatus] = useState<ProductStatus>(status);
	const [isOpen, setIsOpen] = useState<boolean>(false);

	// Options
	const options = Object.values(ProductStatus).filter((s) => s !== newStatus);

	// Handle click
	const handleClick = async (selectedStatus: ProductStatus) => {
		try {
			const response = await updateOrderItemStatus(
				storeId,
				orderItemId,
				selectedStatus,
			);
			if (response) {
				setNewStatus(response as ProductStatus);
				toast.success(`Product status ${selectedStatus} has been updated.`);
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
				<ProductStatusTag status={newStatus} />
			</div>
			{/* Dropdown */}
			{isOpen && (
				<div className='absolute z-50 bg-background border border-gray-200 dark:border-gray-700 rounded-md shadow-md mt-2 w-[170px]'>
					{options.map((option) => (
						<button
							key={option}
							className='w-full flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md'
							onClick={() => handleClick(option)}
						>
							<ProductStatusTag status={option} />
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default ProductStatusSelect;
