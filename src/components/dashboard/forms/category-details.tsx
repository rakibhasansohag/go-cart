// Prisma models
import { Category } from '@prisma/client';

interface CategoryDetailsProps {
	data?: Category;
}

const CategoryDetails = ({ data }: CategoryDetailsProps) => {
	return <div></div>;
};

export default CategoryDetails;
