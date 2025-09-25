import React from 'react';
import Header from '@/components/store/layout/header/header';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Footer from '@/components/store/layout/footer/footer';
import { getProducts } from '@/queries/product';
import ProductList from '@/components/store/shared/product-list';
import ThemeToggle from '@/components/shared/theme-toggle';
import ProductCard from '@/components/store/cards/product/product-card';

async function HomePage() {
	const productsData = await getProducts();

	const { products } = productsData;

	console.log(products);
	return (
		<>
			<Header />
			<ThemeToggle />
			<CategoriesHeader />
			<div>
				<ProductList products={products} title='New Arrivals' arrow />
			</div>

			<div>
				{/* Header */}
				<div className='text-center h-[32px] leading-[32px] text-[24px] font-extrabold text-[#222] flex justify-center'>
					<div className='h-[1px] flex-1 border-t-[2px] border-t-[hsla(0,0%,59.2%,.3)] my-4 mx-[14px]' />
					<span>More to love</span>
					<div className='h-[1px] flex-1 border-t-[2px] border-t-[hsla(0,0%,59.2%,.3)] my-4 mx-[14px]' />
				</div>
				<div className='mt-7 bg-white justify-center flex flex-wrap min-[1530px]:grid min-[1530px]:grid-cols-7 p-4 pb-16 rounded-md'>
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
