import { Button } from '@/components/store/ui/button';
import { useCartStore } from '@/cart-store/useCartStore';
import { CartProductType, Country } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toggleWishlist, checkIsWishlisted } from '@/queries/user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
	Check,
	ChevronRight,
	Heart,
	Minus,
	Plus,
	Trash,
	Truck,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
	Dispatch,
	FC,
	SetStateAction,
	useEffect,
	useRef,
	useState,
} from 'react';
import { toast } from 'sonner';

interface Props {
	product: CartProductType;
	selectedItems: CartProductType[];
	setSelectedItems: Dispatch<SetStateAction<CartProductType[]>>;
	setTotalShipping: Dispatch<SetStateAction<number>>;
	userCountry: Country;
}

const CartProduct: FC<Props> = ({
	product,
	selectedItems,
	setSelectedItems,
	setTotalShipping,
	userCountry,
}) => {
	const {
		productId,
		variantId,
		productSlug,
		variantSlug,
		name,
		variantName,
		sizeId,
		image,
		price,
		quantity,
		stock,
		size,
		weight,
		shippingMethod,
		shippingService,
		shippingFee,
		extraShippingFee,
	} = product;

	// Store previous values to avoid unnecessary re-renders
	const prevShippingFeeRef = useRef(shippingFee);
	const prevUserCountryRef = useRef(userCountry);

	const unique_id = `${productId}-${variantId}-${sizeId}`;

	const totalPrice = price * quantity;

	const [shippingInfo, setShippingInfo] = useState({
		initialFee: 0,
		extraFee: 0,
		totalFee: 0,
		method: shippingMethod,
		weight: weight,
		shippingService: shippingService,
	});

	// Function to calculate shipping fee
	const calculateShipping = (newQty?: number) => {
		let initialFee = 0;
		let extraFee = 0;
		let totalFee = 0;

		const quantityToUse = newQty !== undefined ? newQty : quantity; // Use newQty if passed, else fallback to current quantity

		if (shippingMethod === 'ITEM') {
			initialFee = shippingFee;
			extraFee = quantityToUse > 1 ? extraShippingFee * (quantityToUse - 1) : 0;
			totalFee = initialFee + extraFee;
		} else if (shippingMethod === 'WEIGHT') {
			totalFee = shippingFee * weight * quantityToUse;
		} else if (shippingMethod === 'FIXED') {
			totalFee = shippingFee;
		}

		// Subtract the previous shipping total for this product before updating
		if (stock > 0) {
			setTotalShipping(
				(prevTotal) => prevTotal - shippingInfo.totalFee + totalFee,
			);
		}

		// Update state
		setShippingInfo({
			initialFee,
			extraFee,
			totalFee,
			method: shippingMethod,
			weight,
			shippingService,
		});
	};

	// Recalculate shipping fees whenever quantity, country or fees changes
	useEffect(() => {
		if (
			shippingFee !== prevShippingFeeRef.current ||
			userCountry !== prevUserCountryRef.current
		) {
			calculateShipping();
		}

		// Update refs after calculating shipping
		prevShippingFeeRef.current = shippingFee;
		prevUserCountryRef.current = userCountry;

		// Add a check to recalculate shipping fee on component load (after a refresh)
		if (!shippingInfo.totalFee) {
			calculateShipping();
		}
	}, [quantity, shippingFee, userCountry, shippingInfo.totalFee, stock]);

	const selected = selectedItems.find(
		(p) => unique_id === `${p.productId}-${p.variantId}-${p.sizeId}`,
	);

	const { updateProductQuantity, removeFromCart } = useCartStore(
		(state) => state,
	);

	const handleSelectProduct = () => {
		setSelectedItems((prev) => {
			const exists = prev.some(
				(item) =>
					item.productId === product.productId &&
					item.variantId === product.variantId &&
					item.sizeId === product.sizeId,
			);
			return exists
				? prev.filter((item) => item !== product) // Remove if exists
				: [...prev, product]; // Add if not exists
		});
	};

	const updateProductQuantityHandler = (type: 'add' | 'remove') => {
		if (type === 'add' && quantity < stock) {
			// Increase quantity by 1 but ensure it doesn't exceed stock
			updateProductQuantity(product, quantity + 1);
			calculateShipping(quantity + 1);
		} else if (type === 'remove' && quantity > 1) {
			// Decrease quantity by 1 but ensure it doesn't go below 1
			updateProductQuantity(product, quantity - 1);
			calculateShipping(quantity - 1);
		}
	};

	const queryClient = useQueryClient();

	const [isInWishlist, setIsInWishlist] = useState(false);

	useEffect(() => {
		let isMounted = true;
		checkIsWishlisted(productId, variantId).then((res: boolean) => {
			if (isMounted) setIsInWishlist(res);
		});
		return () => {
			isMounted = false;
		};
	}, [productId, variantId]);

	const wishlistToggleMutation = useMutation({
		mutationFn: () => toggleWishlist(productId, variantId, sizeId),
		onSuccess: (data: { isWishlisted: boolean; message: string }) => {
			setIsInWishlist(data.isWishlisted);
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: queryKeys.profile.wishlist(1) });
		},
		onError: (error: any) => {
			toast.error(error.message || error.toString());
		},
	});

	const handleWishlistToggle = () => {
		wishlistToggleMutation.mutate();
	};

	return (
		<div
			className={cn(
				'bg-background px-3 sm:px-6 border-t border-t-[#ebebeb] select-none transition-colors',
				{
					'bg-red-100/50 dark:bg-red-950/20': stock === 0,
				},
			)}
		>
			<div className='py-4'>
				<div className='relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4'>
					{/* Checkbox and Image */}
					<div className='flex items-center shrink-0 gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start'>
						<div className='flex items-center gap-2'>
							{stock > 0 && (
								<label
									htmlFor={unique_id}
									className='p-0 text-gray-900 text-sm leading-6 inline-flex items-center cursor-pointer align-middle shrink-0'
								>
									<span className='leading-8 inline-flex p-0.5 cursor-pointer'>
										<span
											className={cn(
												'leading-8 w-5 h-5 rounded-full bg-background border border-gray-300 flex items-center justify-center hover:border-orange-background transition-colors',
												{
													'border-orange-background': selected,
												},
											)}
										>
											{selected && (
												<span className='bg-orange-background w-5 h-5 rounded-full flex items-center justify-center'>
													<Check className='w-3.5 text-white' />
												</span>
											)}
										</span>
									</span>
									<input
										type='checkbox'
										id={unique_id}
										hidden
										onChange={() => handleSelectProduct()}
									/>
								</label>
							)}
							<Link href={`/product/${productSlug}?variant=${variantSlug}`}>
								<div className='w-20 h-20 sm:w-28 sm:h-28 bg-gray-200 relative rounded-lg overflow-hidden shrink-0 border border-border/60'>
									<Image
										src={image}
										alt={name}
										fill
										className='object-cover'
									/>
								</div>
							</Link>
						</div>

						{/* Action icons on small screens */}
						<div className='flex sm:hidden items-center gap-3 text-muted-foreground'>
							<span
								className='cursor-pointer p-1 hover:text-red-500 transition-colors'
								onClick={handleWishlistToggle}
							>
								<Heart
									className={cn('w-4 h-4 transition-colors', {
										'fill-red-500 stroke-red-500': isInWishlist,
									})}
								/>
							</span>
							<span
								className='cursor-pointer p-1 hover:text-red-500 transition-colors'
								onClick={() => removeFromCart(product)}
							>
								<Trash className='w-4 h-4' />
							</span>
						</div>
					</div>

					{/* Product Details & Controls */}
					<div className='w-full min-w-0 flex-1 space-y-1.5'>
						{/* Title & Desktop Actions */}
						<div className='flex items-start justify-between gap-2'>
							<Link
								href={`/product/${productSlug}?variant=${variantSlug}`}
								className='font-bold text-sm sm:text-base text-foreground hover:text-primary transition-colors line-clamp-2 break-words'
							>
								{name} {variantName && `· ${variantName}`}
							</Link>
							<div className='hidden sm:flex items-center gap-3 shrink-0 text-muted-foreground'>
								<span
									className='cursor-pointer p-1 hover:text-red-500 transition-colors'
									onClick={handleWishlistToggle}
								>
									<Heart
										className={cn('w-4 h-4 transition-colors', {
											'fill-red-500 stroke-red-500': isInWishlist,
										})}
									/>
								</span>
								<span
									className='cursor-pointer p-1 hover:text-red-500 transition-colors'
									onClick={() => removeFromCart(product)}
								>
									<Trash className='w-4 h-4' />
								</span>
							</div>
						</div>

						{/* Style / Size Badge */}
						<div>
							<Button
								variant='unstyled'
								className='text-main-primary relative h-[24px] bg-gray-100 dark:bg-gray-700 whitespace-normal px-2.5 py-0 max-w-full text-xs leading-4 rounded-xl font-bold cursor-pointer outline-0'
							>
								<span className='flex items-center justify-between flex-wrap'>
									<div className='text-left inline-block overflow-hidden text-ellipsis whitespace-nowrap max-w-[95%]'>
										{size}
									</div>
									<span className='ml-0.5'>
										<ChevronRight className='w-3' />
									</span>
								</span>
							</Button>
						</div>

						{/* Price & Quantity Controls */}
						<div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
							{stock > 0 ? (
								<div className='text-xs sm:text-sm font-semibold text-foreground'>
									${price.toFixed(2)} x {quantity} = <span className='text-primary font-bold'>${totalPrice.toFixed(2)}</span>
								</div>
							) : (
								<div>
									<span className='text-xs font-semibold text-destructive'>
										Out of stock
									</span>
								</div>
							)}

							{/* Quantity Changer */}
							<div className='inline-flex items-center gap-1 bg-muted/40 p-1 rounded-full border border-border/60 shrink-0'>
								<div
									className='w-7 h-7 bg-background hover:bg-accent grid place-items-center rounded-full cursor-pointer transition-colors border border-border/40'
									onClick={() => updateProductQuantityHandler('remove')}
								>
									<Minus className='w-3 h-3 text-foreground' />
								</div>

								<input
									type='text'
									value={quantity}
									min={1}
									max={stock}
									readOnly
									className='w-8 h-7 bg-transparent border-none text-center font-bold text-xs outline-none text-foreground'
								/>

								<div
									className='w-7 h-7 bg-background hover:bg-accent grid place-items-center rounded-full cursor-pointer transition-colors border border-border/40'
									onClick={() => updateProductQuantityHandler('add')}
								>
									<Plus className='w-3 h-3 text-foreground' />
								</div>
							</div>
						</div>

						{/* Shipping Info */}
						{stock > 0 && (
							<div className='pt-1 text-xs text-muted-foreground flex items-center flex-wrap gap-1'>
								<Truck className='w-4 h-4 text-emerald-600 inline-block shrink-0' />
								{shippingInfo.totalFee > 0 ? (
									<span className='text-emerald-600 font-medium'>
										{shippingMethod === 'ITEM' ? (
											<>
												${shippingInfo.initialFee} (1st item)
												{quantity > 1
													? ` + ${quantity - 1} x $${extraShippingFee}`
													: ''}
												 = ${shippingInfo.totalFee.toFixed(2)}
											</>
										) : shippingMethod === 'WEIGHT' ? (
											<>
												${shippingFee} x {shippingInfo.weight}kg x {quantity} = ${shippingInfo.totalFee.toFixed(2)}
											</>
										) : (
											<>Fixed Shipping: ${shippingInfo.totalFee.toFixed(2)}</>
										)}
									</span>
								) : (
									<span className='text-emerald-600 font-medium'>Free Delivery</span>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default CartProduct;
