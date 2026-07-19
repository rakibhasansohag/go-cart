import { ProductType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { FC } from 'react';
import ProductCard from '../cards/product/product-card';

interface Props {
	products: ProductType[];
	title?: string;
	link?: string;
	arrow?: boolean;
}

const ProductList: FC<Props> = ({ products, title, link, arrow }) => {
	const Title = () => {
		if (link) {
			<Link href={link} className='h-12'>
				<h2 className='text-main-primary text-xl font-bold'>
					{title}&nbsp;
					{arrow && <ChevronRight className='w-3 inline-block' />}
				</h2>
			</Link>;
		} else {
			return (
				<h2 className='text-main-primary text-xl font-bold'>
					{title}&nbsp;
					{arrow && <ChevronRight className='w-3 inline-block' />}
				</h2>
			);
		}
	};
	return (
		<div className='relative'>
			{title && <Title />}
			{products.length > 0 ? (
				<div
					className={cn(
						'grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4',
						{
							'mt-2': title,
						}
					)}
				>
					{products.map((product, index) => (
						<ProductCard key={`${product.id}-${index}`} product={product} className='w-full' />
					))}
				</div>
			) : (
				'No Products.'
			)}
		</div>
	);
};

export default ProductList;
