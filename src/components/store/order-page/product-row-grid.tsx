import ProductStatusTag from '@/components/shared/product-status';
import { ProductStatus } from '@/lib/types';
import { OrderItem } from '@prisma/client';
import Image from 'next/image';
import ReturnLink from './return-link';

export default function ProductRowGrid({
	product,
	canRequestReturn = false,
}: {
	product: OrderItem;
	canRequestReturn?: boolean;
}) {
	const nameParts = product.name.split('·');
	const mainName = nameParts[0]?.trim();
	const variantName = nameParts[1]?.trim();

	return (
		<div className='flex items-start gap-4 py-4 w-full border-b border-border/30 last:border-0'>
			<Image
				src={product.image || '/assets/images/placeholder.png'}
				alt={mainName || 'Product'}
				width={96}
				height={96}
				className='w-20 h-20 rounded-xl object-cover ring-1 ring-border/40 shrink-0'
			/>

			<div className='flex-1 min-w-0 flex flex-col justify-between self-stretch'>
				<div>
					<div className='flex items-start justify-between gap-2'>
						<h2 className='font-bold text-sm text-foreground line-clamp-2 leading-snug'>
							{mainName}
						</h2>
						<span className='font-extrabold text-sm text-primary shrink-0'>
							${product.price.toFixed(2)}
						</span>
					</div>

					{variantName && (
						<p className='text-xs text-muted-foreground font-medium mt-0.5'>
							{variantName}
						</p>
					)}
					<p className='text-[11px] font-mono text-muted-foreground/70 mt-0.5'>
						SKU: #{product.sku}
					</p>
				</div>

				<div className='flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/20 text-xs flex-wrap'>
					<div className='flex items-center gap-2'>
						<span className='px-2 py-0.5 rounded-md bg-muted/60 border border-border/40 font-medium text-foreground text-[11px]'>
							Size: <strong className='text-foreground'>{product.size}</strong>
						</span>
						<span className='px-2 py-0.5 rounded-md bg-muted/60 border border-border/40 font-medium text-foreground text-[11px]'>
							Qty: <strong className='text-foreground'>{product.quantity}</strong>
						</span>
					</div>

					<ProductStatusTag status={product.status as ProductStatus} />
				</div>
				{canRequestReturn && (
					<div className='mt-2 flex justify-end'>
						<ReturnLink orderItemId={product.id} />
					</div>
				)}
			</div>
		</div>
	);
}
