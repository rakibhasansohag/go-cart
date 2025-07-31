import { getAllCategories } from '../../../../queries/category';

const AdminCategoriesPage = async () => {
	// Retreive all categories
	const categories = await getAllCategories();

	// Checking if no categories are found
	if (!categories) return null;

	return (
		<div>
			<h1>Categories</h1>
		</div>
	);
};

export default AdminCategoriesPage;
