import { Plus } from 'lucide-react';
import DataTable from '../../../../components/ui/data-table';
import { getAllCategories } from '../../../../queries/category';
import CategoryDetails from '../../../../components/dashboard/forms/category-details';
import { columns } from './columns';

const AdminCategoriesPage = async () => {
	// Retreive all categories
	const categories = await getAllCategories();

	const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET;
	if (!CLOUDINARY_CLOUD_NAME) throw new Error('Missing Cloudinary Cloud Name');

	// Checking if no categories are found
	if (!categories) return null;

	return (
		<DataTable
			actionButtonText={
				<>
					<Plus size={15} />
					Create category
				</>
			}
			modalChildren={<CategoryDetails cloudinary_key={CLOUDINARY_CLOUD_NAME} />}
			newTabLink='/dashboard/admin/categories/new'
			filterValue='name'
			data={categories}
			searchPlaceholder='Search category name...'
			columns={columns}
		/>
	);
};

export default AdminCategoriesPage;
