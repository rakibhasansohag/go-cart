import React from 'react';
import SubCategoryDetails from '@/components/dashboard/forms/subCategory-details';
import { getAllCategories } from '@/queries/category';

async function AdminNewSubCategoryPage() {
	const categories = await getAllCategories();

	console.log('categories', categories);
	return (
		<div>
			<SubCategoryDetails categories={categories} goBack />
		</div>
	);
}

export default AdminNewSubCategoryPage;
