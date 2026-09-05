'use client';

import React, { FC } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Package, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductData {
	id: string;
	name: string;
	slug: string;
	image: string;
	price: number;
}

interface Props {
	rawText: string;
	isOutgoing: boolean;
}

export const InChatProductCard: FC<Props> = ({ rawText, isOutgoing }) => {
	let product: ProductData | null = null;

	if (rawText.startsWith('[PRODUCT_RECOMMENDATION]:')) {
		try {
			const jsonStr = rawText.replace('[PRODUCT_RECOMMENDATION]:', '').trim();
			product = JSON.parse(jsonStr) as ProductData;
		} catch {
			product = null;
		}
	}

	if (!product) {
		return <span>{rawText}</span>;
	}

	return (
		<div className='space-y-2 max-w-sm text-left'>
			<div className='flex items-center gap-1.5 text-[11px] font-semibold opacity-90'>
				<Sparkles className='w-3.5 h-3.5 text-amber-400' />
				<span>Recommended Product</span>
			</div>

			<div
				className={`flex items-center gap-3 p-2.5 rounded-xl border ${
					isOutgoing
						? 'bg-background/20 border-white/20 text-primary-foreground'
						: 'bg-card border-border/40 text-foreground'
				}`}
			>
				<div className='relative w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/30'>
					{product.image ? (
						<Image
							src={product.image}
							alt={product.name}
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
					<p className='font-semibold text-xs truncate'>{product.name}</p>
					<p
						className={`text-xs font-bold mt-0.5 ${
							isOutgoing ? 'text-white' : 'text-primary'
						}`}
					>
						${Number(product.price).toFixed(2)}
					</p>

					<div className='mt-2'>
						<Button
							asChild
							size='sm'
							variant={isOutgoing ? 'secondary' : 'default'}
							className='h-7 text-[11px] px-2.5 gap-1 font-semibold shadow-xs'
						>
							<Link
								href={`/product/${product.slug}`}
								target='_blank'
								rel='noopener noreferrer'
							>
								<span>View Product</span>
								<ExternalLink className='w-3 h-3 ml-0.5' />
							</Link>
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default InChatProductCard;
