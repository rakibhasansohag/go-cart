import { CartProductType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/providers/currency-provider';
import { FC, useEffect, useState } from 'react';

interface SimplifiedSize {
	id: string;
	size: string;
	quantity: number;
	price: number;
	discount: number;
}

interface Props {
	sizeId?: string | undefined;
	sizes: SimplifiedSize[];
	isCard?: boolean;
	handleChange: <K extends keyof CartProductType>(property: K, value: CartProductType[K]) => void;
	weight?: number;
}

const ProductPrice: FC<Props> = ({
	sizeId,
	sizes,
	isCard,
	handleChange,
	weight,
}) => {
	const { formatPrice, isBaseCurrency, currency } = useCurrency();
	const [selectedSize, setSelectedSize] = useState<SimplifiedSize | undefined>(
		undefined,
	);

	useEffect(() => {
		if (sizes && sizes.length > 0) {
			if (sizeId) {
				const foundSize = sizes.find((size) => size.id === sizeId);
				if (foundSize) {
					setSelectedSize(foundSize);
					const discountedPrice =
						foundSize.price * (1 - foundSize.discount / 100);
					handleChange('price', discountedPrice);
					handleChange('stock', foundSize.quantity);
				}
			}
		}
	}, [sizeId, sizes]);

	// If no sizeId passed, calculate range of prices and total quantity
	if (!sizeId && sizes && sizes.length > 0) {
		const discountedPrices = sizes.map(
			(size) => size.price * (1 - size.discount / 100),
		);

		const totalQuantity = sizes.reduce(
			(total, size) => total + size.quantity,
			0,
		);

		const minPriceNum = Math.min(...discountedPrices);
		const maxPriceNum = Math.max(...discountedPrices);

		const priceDisplay =
			minPriceNum === maxPriceNum
				? formatPrice(minPriceNum)
				: `${formatPrice(minPriceNum)} - ${formatPrice(maxPriceNum)}`;

		const usdRangeDisplay =
			minPriceNum === maxPriceNum
				? `$${minPriceNum.toFixed(2)}`
				: `$${minPriceNum.toFixed(2)} - $${maxPriceNum.toFixed(2)}`;

		return (
			<div>
				<div className='text-orange-primary inline-block font-bold leading-none mr-2.5'>
					<span
						className={cn('inline-block text-4xl text-nowrap', {
							'text-lg': isCard,
						})}
					>
						{priceDisplay}
					</span>
				</div>
				{!isBaseCurrency && !isCard && (
					<div className='text-xs text-muted-foreground mt-0.5'>
						<span>Charged in USD ({usdRangeDisplay})</span>
					</div>
				)}
				{!sizeId && !isCard && (
					<div className='text-orange-background text-xs leading-4 mt-1'>
						<span>Note : Select a size to see the exact price</span>
					</div>
				)}
				{!sizeId && !isCard && (
					<p className='mt-2 text-xs'>{totalQuantity} pieces</p>
				)}
			</div>
		);
	}

	// If sizeId passed, show specific size price and quantity
	if (selectedSize) {
		const discountedPrice =
			selectedSize.price * (1 - selectedSize.discount / 100);

		return (
			<div>
				<div className='text-orange-primary inline-block font-bold leading-none mr-2.5'>
					<span className='inline-block text-4xl'>
						{formatPrice(discountedPrice)}
					</span>
				</div>
				{selectedSize.price !== discountedPrice && (
					<span className='text-neutral-400 inline-block text-xl font-normal leading-6 mr-2 line-through'>
						{formatPrice(selectedSize.price)}
					</span>
				)}
				{selectedSize.discount > 0 && (
					<span className='inline-block text-orange-secondary text-xl leading-6'>
						{selectedSize.discount}% off
					</span>
				)}
				{!isBaseCurrency && (
					<div className='text-xs text-muted-foreground mt-1'>
						<span>Charged in USD (${discountedPrice.toFixed(2)})</span>
					</div>
				)}
				<p className='mt-2 text-xs'>
					{weight && <span>{weight}kg - </span>}
					{selectedSize.quantity > 0 ? (
						`${selectedSize.quantity} items`
					) : (
						<span className='text-red-500'>Out of stock</span>
					)}
				</p>
			</div>
		);
	}

	return null;
};

export default ProductPrice;
