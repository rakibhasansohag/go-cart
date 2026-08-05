'use client';
import { useCartStore } from '@/cart-store/useCartStore';
import useFromStore from '@/hooks/useFromStore';
import { CartProductType } from '@/lib/types';
import { Size } from '@prisma/client';
import { Minus, Plus } from 'lucide-react';
import { FC, useEffect } from 'react';
import { Button } from '@/components/store/ui/button';

interface QuantitySelectorProps {
	productId: string;
	variantId: string;
	sizeId: string | null;
	quantity: number;
	stock: number;
	handleChange: <K extends keyof CartProductType>(property: K, value: CartProductType[K]) => void;
	sizes: Size[];
}

const QuantitySelector: FC<QuantitySelectorProps> = ({
	handleChange,
	productId,
	quantity,
	sizeId,
	sizes,
	variantId,
	stock,
}) => {
	const cart = useFromStore(useCartStore, (state) => state.cart);

	const maxQty =
		cart && sizeId
			? (() => {
					const search_product = cart?.find(
						(p) =>
							p.productId === productId &&
							p.variantId === variantId &&
							p.sizeId === sizeId,
					);
					return search_product
						? search_product.stock - search_product.quantity
						: stock;
			  })()
			: stock;

	useEffect(() => {
		handleChange('quantity', 1);
	}, [sizeId]);

	const handleIncrease = () => {
		if (quantity < maxQty) {
			handleChange('quantity', quantity + 1);
		}
	};

	const handleDecrease = () => {
		if (quantity > 1) {
			handleChange('quantity', quantity - 1);
		}
	};

	return (
		<div className='w-full py-2 px-3 bg-accent border border-gray-200 dark:border-gray-800 rounded-lg'>
			<div className='w-full flex justify-between items-center gap-x-5'>
				<div className='grow'>
					<span className='block text-xs text-gray-500 dark:text-gray-400'>
						Select quantity
					</span>
					<span className='block text-xs text-gray-500'>
						{maxQty !== stock &&
							`(You already have ${
								stock - maxQty
							} more of this product in cart)`}
					</span>
				</div>
				<div className='flex justify-end items-center gap-x-1.5'>
					<Button
						variant='unstyled'
						className='size-6 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-full border border-gray-200 bg-white text-gray-800 shadow-sm focus:outline-none focus:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:focus:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer'
						onClick={handleDecrease}
						disabled={quantity === 1}
					>
						<Minus className='w-3' />
					</Button>
					<span className='w-4 text-center text-sm'>{quantity}</span>
					<Button
						variant='unstyled'
						className='size-6 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-full border border-gray-200 bg-white text-gray-800 shadow-sm focus:outline-none focus:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:focus:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed cursor-pointer'
						onClick={handleIncrease}
						disabled={quantity === maxQty}
					>
						<Plus className='w-3' />
					</Button>
				</div>
			</div>
		</div>
	);
};

export default QuantitySelector;
