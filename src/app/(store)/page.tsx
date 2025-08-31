import React from 'react';
import Header from '@/components/store/layout/header/header';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';

async function HomePage() {
	return (
		<>
			<Header />
			<CategoriesHeader />
		</>
	);
}

export default HomePage;
