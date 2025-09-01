import React from 'react';
import Header from '@/components/store/layout/header/header';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Footer from '@/components/store/layout/footer/footer';

async function HomePage() {
	return (
		<>
			<Header />
			<CategoriesHeader />

			<Footer />
		</>
	);
}

export default HomePage;
