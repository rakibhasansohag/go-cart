import React from 'react';
import Header from '@/components/store/layout/header/header';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Footer from '@/components/store/layout/footer/footer';
import { getProducts } from '@/queries/product';

import ThemeToggle from '@/components/shared/theme-toggle';
import ProductCard from '@/components/store/cards/product/product-card';
import { getHomeDataDynamic } from '@/queries/home';

async function HomePage() {
	const productsData = await getProducts({}, '', 1, 100);

	const { products } = productsData;

	const {
		products_super_deals,
		products_best_deals,
		products_user_card,
		products_featured,
	} = await getHomeDataDynamic([
		{ property: 'offer', value: 'best-deals', type: 'simple' },
		{ property: 'offer', value: 'super-deals', type: 'full' },
		{ property: 'offer', value: 'user-card', type: 'simple' },
		{ property: 'offer', value: 'featured', type: 'simple' },
	]);

	return (
		<>
			<Header />
			<CategoriesHeader />
			<ThemeToggle />

			<div>
				{/* Header */}
				<div className='text-center h-[32px] leading-[32px] text-[24px] font-extrabold text-[#222] flex justify-center'>
					<div className='h-[1px] flex-1 border-t-[2px] border-t-[hsla(0,0%,59.2%,.3)] my-4 mx-[14px]' />
					<span>More to love</span>
					<div className='h-[1px] flex-1 border-t-[2px] border-t-[hsla(0,0%,59.2%,.3)] my-4 mx-[14px]' />
				</div>
				<div className='mt-7 bg-background justify-center flex flex-wrap min-[1530px]:grid min-[1530px]:grid-cols-7 p-4 pb-16 rounded-md'>
					{products.map((product, i) => (
						<ProductCard key={i} product={product} />
					))}
				</div>
			</div>
			<Footer />
		</>
	);
}

export default HomePage;
