'use client';
import { ProductType } from '@/lib/types';
import { getProducts } from '@/queries/product';
import { FC } from 'react';
import ProductList from '../shared/product-list';
import { ChevronRight } from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

interface Props {
	storeUrl: string;
	storeName: string;
	count: number;
}

const StoreProducts: FC<Props> = ({ storeUrl, count, storeName }) => {
	const { data: res } = useSuspenseQuery<{ products: ProductType[] }>({
		queryKey: queryKeys.products.storeProducts(storeUrl),
		queryFn: () => getProducts({ store: storeUrl }, '', null, count),
	});

	const products = res.products;

	return (
		<div className='pt-6' id='reviews'>
			{/* Title */}
			<div className='h-12'>
				<h2 className='text-main-primary text-2xl font-bold'>
					Recommended from {storeName}
					<ChevronRight className='w-5 inline-block' />
				</h2>
			</div>
			{/* Products */}
			<div className='mt-8 min-[620px]:mt-0'>
				<ProductList products={products} />
			</div>
		</div>
	);
};

export default StoreProducts;
