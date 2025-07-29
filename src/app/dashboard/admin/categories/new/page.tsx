import CategoryDetails from '../../../../../components/dashboard/forms/category-details';

const AdminNewCategoricPage = () => {
	const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET;
	if (!CLOUDINARY_CLOUD_NAME) throw new Error('Missing Cloudinary Cloud Name');

	return (
		<div className='w-full'>
			<CategoryDetails cloudinary_key={CLOUDINARY_CLOUD_NAME} />
		</div>
	);
};

export default AdminNewCategoricPage;
