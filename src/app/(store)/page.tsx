import React from 'react';
import Header from '@/components/store/layout/header/header';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Footer from '@/components/store/layout/footer/footer';
import { getProducts } from '../../queries/product';

async function HomePage() {
	const getProduct = await getProducts();
	console.log(getProduct);
	return (
		<>
			<Header />
			<CategoriesHeader />

			<Footer />
		</>
	);
}

export default HomePage;
