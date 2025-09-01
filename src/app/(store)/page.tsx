import React from 'react';
import Header from '@/components/store/layout/header/header';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Footer from '@/components/store/layout/footer/footer';
import { getProducts } from '../../queries/product';
import ProductList from '../../components/store/shared/product-list';
import ThemeToggle from '../../components/shared/theme-toggle';

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
			<Footer />
		</>
	);
}

export default HomePage;
