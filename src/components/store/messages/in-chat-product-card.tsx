'use client';

import React, { FC, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
	Package,
	ExternalLink,
	Sparkles,
	ShoppingCart,
	Zap,
	Check,
	MessageSquareShare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCartStore } from '@/cart-store/useCartStore';
import { CartProductType } from '@/lib/types';

export interface RecommendedProductItem {
	id: string;
	name: string;
	slug: string;
	image: string;
	price: number;
	variantId?: string;
	variantSlug?: string;
	variantName?: string;
	sizeId?: string;
	size?: string;
	stock?: number;
	weight?: number;
	storeId?: string;
}

interface Props {
	rawText: string;
	isOutgoing: boolean;
	onSendReply?: (text: string) => void;
}

export const InChatProductCard: FC<Props> = ({ rawText, isOutgoing, onSendReply }) => {
	const router = useRouter();
	const addToCart = useCartStore((state) => state.addToCart);

	let singleProduct: RecommendedProductItem | null = null;
	let productList: RecommendedProductItem[] = [];

	if (rawText.startsWith('[PRODUCT_RECOMMENDATIONS]:')) {
		try {
			const jsonStr = rawText.replace('[PRODUCT_RECOMMENDATIONS]:', '').trim();
			const parsed = JSON.parse(jsonStr);
			if (Array.isArray(parsed)) {
				productList = parsed as RecommendedProductItem[];
			}
		} catch {
			productList = [];
		}
	} else if (rawText.startsWith('[PRODUCT_RECOMMENDATION]:')) {
		try {
			const jsonStr = rawText.replace('[PRODUCT_RECOMMENDATION]:', '').trim();
			singleProduct = JSON.parse(jsonStr) as RecommendedProductItem;
		} catch {
			singleProduct = null;
		}
	}

	// State for customer selection in multi-product cards
	const [selectedIds, setSelectedIds] = useState<string[]>(() => {
		if (productList.length > 0) {
			return productList.map((p) => p.id);
		}
		return [];
	});

	if (!singleProduct && productList.length === 0) {
		return <span className='leading-relaxed'>{rawText}</span>;
	}

	const buildCartItem = (p: RecommendedProductItem): CartProductType => ({
		productId: p.id,
		variantId: p.variantId || p.id,
		productSlug: p.slug,
		variantSlug: p.variantSlug || p.slug,
		name: p.name,
		variantName: p.variantName || 'Standard',
		image: p.image || '',
		variantImage: p.image || '',
		sizeId: p.sizeId || `${p.id}-default-size`,
		size: p.size || 'Default',
		quantity: 1,
		price: Number(p.price) || 0,
		stock: p.stock ?? 10,
		weight: p.weight ?? 0.5,
		shippingMethod: 'ITEM',
		shippingService: 'Standard Delivery',
		shippingFee: 0,
		extraShippingFee: 0,
		deliveryTimeMin: 2,
		deliveryTimeMax: 5,
		isFreeShipping: false,
		storeId: p.storeId,
	});

	const handleInstantCheckout = (itemsToBuy: RecommendedProductItem[]) => {
		if (itemsToBuy.length === 0) return;
		for (const p of itemsToBuy) {
			addToCart(buildCartItem(p));
		}
		toast.success(`Added ${itemsToBuy.length} item${itemsToBuy.length > 1 ? 's' : ''} to cart. Opening checkout...`);
		router.push('/cart');
	};

	const handleAddToCartOnly = (itemsToAdd: RecommendedProductItem[]) => {
		if (itemsToAdd.length === 0) return;
		for (const p of itemsToAdd) {
			addToCart(buildCartItem(p));
		}
		toast.success(`Added ${itemsToAdd.length} item${itemsToAdd.length > 1 ? 's' : ''} to your cart.`);
	};

	const handleTellSellerChoice = (items: RecommendedProductItem[]) => {
		if (!onSendReply || items.length === 0) return;
		const names = items.map((i) => `"${i.name}"`).join(', ');
		const total = items.reduce((acc, i) => acc + Number(i.price || 0), 0);
		onSendReply(`I would like to order: ${names} (Total: $${total.toFixed(2)})`);
		toast.success('Sent your choice to the store owner!');
	};

	// Multi-product recommendation layout
	if (productList.length > 0) {
		const selectedProducts = productList.filter((p) => selectedIds.includes(p.id));
		const totalSelectedPrice = selectedProducts.reduce((acc, p) => acc + Number(p.price || 0), 0);

		return (
			<div className='w-full max-w-md rounded-2xl bg-card border border-border/80 shadow-md p-3.5 space-y-3 text-card-foreground text-left'>
				{/* Card Header */}
				<div className='flex items-center justify-between border-b border-border/40 pb-2'>
					<div className='flex items-center gap-1.5'>
						<div className='p-1 rounded-md bg-amber-500/10 text-amber-500'>
							<Sparkles className='w-3.5 h-3.5' />
						</div>
						<span className='font-semibold text-xs text-foreground'>
							Recommended Options ({productList.length})
						</span>
					</div>
					<Badge
						variant='outline'
						className='text-[10px] py-0 h-4 px-1.5 font-medium text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/5'
					>
						Direct Checkout
					</Badge>
				</div>

				{/* Products list with interactive selection */}
				<div className='space-y-2 max-h-72 overflow-y-auto pr-0.5'>
					{productList.map((p) => {
						const isChecked = selectedIds.includes(p.id);
						return (
							<div
								key={p.id}
								onClick={() => {
									setSelectedIds((prev) =>
										prev.includes(p.id)
											? prev.filter((id) => id !== p.id)
											: [...prev, p.id]
									);
								}}
								className={`flex items-center justify-between p-2 rounded-xl border transition-colors gap-2.5 cursor-pointer ${
									isChecked
										? 'border-blue-500/60 bg-blue-500/5 dark:bg-blue-950/20'
										: 'border-border/50 bg-background/50 hover:bg-muted/40'
								}`}
							>
								<div className='flex items-center gap-2.5 min-w-0 flex-1'>
									<div
										className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
											isChecked
												? 'bg-blue-600 border-blue-600 text-white'
												: 'border-muted-foreground/40 bg-background'
										}`}
									>
										{isChecked && <Check className='w-3 h-3 stroke-[3]' />}
									</div>

									<div className='relative w-11 h-11 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/40'>
										{p.image ? (
											<Image
												src={p.image}
												alt={p.name}
												fill
												className='object-cover'
											/>
										) : (
											<div className='w-full h-full flex items-center justify-center text-muted-foreground'>
												<Package className='w-4 h-4' />
											</div>
										)}
									</div>

									<div className='min-w-0 flex-1'>
										<p className='text-xs font-semibold text-foreground truncate'>
											{p.name}
										</p>
										<div className='flex items-center gap-2 mt-0.5'>
											<span className='text-xs font-bold text-emerald-600 dark:text-emerald-400'>
												${Number(p.price).toFixed(2)}
											</span>
											{p.size && (
												<span className='text-[10px] font-mono text-muted-foreground'>
													({p.size})
												</span>
											)}
										</div>
									</div>
								</div>

								<Button
									asChild
									size='sm'
									variant='ghost'
									onClick={(e) => e.stopPropagation()}
									className='h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0'
									title='View product page'
								>
									<Link
										href={`/product/${p.slug}`}
										target='_blank'
										rel='noopener noreferrer'
									>
										<ExternalLink className='w-3.5 h-3.5' />
									</Link>
								</Button>
							</div>
						);
					})}
				</div>

				{/* Footer summary & conversion actions */}
				<div className='pt-2 border-t border-border/50 space-y-2'>
					<div className='flex items-center justify-between text-xs'>
						<span className='text-muted-foreground'>
							Selected: <strong>{selectedProducts.length} item{selectedProducts.length > 1 ? 's' : ''}</strong>
						</span>
						<span className='font-bold text-sm text-foreground'>
							${totalSelectedPrice.toFixed(2)}
						</span>
					</div>

					<div className='grid grid-cols-2 gap-2'>
						<Button
							type='button'
							size='sm'
							disabled={selectedProducts.length === 0}
							onClick={() => handleInstantCheckout(selectedProducts)}
							className='h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs'
						>
							<Zap className='w-3 h-3 fill-white' />
							<span>⚡ Direct Checkout</span>
						</Button>

						<Button
							type='button'
							size='sm'
							variant='outline'
							disabled={selectedProducts.length === 0}
							onClick={() => handleAddToCartOnly(selectedProducts)}
							className='h-8 text-xs gap-1.5 border-border/80 text-foreground hover:bg-muted'
						>
							<ShoppingCart className='w-3 h-3' />
							<span>Add to Cart</span>
						</Button>
					</div>

					{/* Optional buyer confirmation message back to seller */}
					{onSendReply && (
						<Button
							type='button'
							variant='ghost'
							size='sm'
							disabled={selectedProducts.length === 0}
							onClick={() => handleTellSellerChoice(selectedProducts)}
							className='w-full h-7 text-[11px] gap-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10'
						>
							<MessageSquareShare className='w-3 h-3' />
							<span>Tell Seller I chose these</span>
						</Button>
					)}
				</div>
			</div>
		);
	}

	// Single product recommendation layout
	if (singleProduct) {
		const p = singleProduct;
		return (
			<div className='w-full max-w-sm rounded-2xl bg-card border border-border/80 shadow-md p-3.5 space-y-2.5 text-card-foreground text-left'>
				{/* Header */}
				<div className='flex items-center justify-between border-b border-border/40 pb-1.5'>
					<div className='flex items-center gap-1.5 text-xs font-semibold text-foreground'>
						<Sparkles className='w-3.5 h-3.5 text-amber-500' />
						<span>Recommended Product</span>
					</div>
					<Badge
						variant='outline'
						className='text-[10px] py-0 h-4 px-1.5 font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5'
					>
						Available
					</Badge>
				</div>

				{/* Product Body */}
				<div className='flex items-center gap-3 py-0.5'>
					<div className='relative w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/40'>
						{p.image ? (
							<Image
								src={p.image}
								alt={p.name}
								fill
								className='object-cover'
							/>
						) : (
							<div className='w-full h-full flex items-center justify-center text-muted-foreground'>
								<Package className='w-5 h-5' />
							</div>
						)}
					</div>

					<div className='min-w-0 flex-1'>
						<p className='font-semibold text-xs text-foreground truncate' title={p.name}>
							{p.name}
						</p>
						<div className='flex items-center gap-2 mt-1'>
							<span className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>
								${Number(p.price).toFixed(2)}
							</span>
							{p.size && (
								<span className='text-[10px] font-mono text-muted-foreground'>
									Size: {p.size}
								</span>
							)}
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className='pt-1.5 border-t border-border/40 flex items-center gap-2'>
					<Button
						type='button'
						size='sm'
						onClick={() => handleInstantCheckout([p])}
						className='flex-1 h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs'
					>
						<Zap className='w-3 h-3 fill-white' />
						<span>⚡ Buy Now</span>
					</Button>

					<Button
						asChild
						size='sm'
						variant='outline'
						className='h-8 text-xs px-2.5 gap-1 border-border/80 text-foreground hover:bg-muted shrink-0'
					>
						<Link
							href={`/product/${p.slug}`}
							target='_blank'
							rel='noopener noreferrer'
						>
							<span>View</span>
							<ExternalLink className='w-3 h-3' />
						</Link>
					</Button>
				</div>
			</div>
		);
	}

	return null;
};

export default InChatProductCard;
