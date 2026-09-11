import { getStoreReviews } from '@/queries/review-actions';
import SellerReviewsClient from './_components/seller-reviews-client';

interface PageProps {
	params: Promise<{ storeUrl: string }>;
	searchParams: Promise<{
		page?: string;
		rating?: string;
		reply?: string;
	}>;
}

export default async function SellerReviewsPage({ params, searchParams }: PageProps) {
	const { storeUrl } = await params;
	const { page, rating, reply } = await searchParams;

	const currentPage = Number(page) || 1;
	const ratingFilter = rating ? Number(rating) : undefined;
	const replyFilter = reply === 'replied' || reply === 'unreplied' ? reply : undefined;

	const data = await getStoreReviews(storeUrl, currentPage, 10, ratingFilter, replyFilter);

	return (
		<div className='p-4 md:p-6 space-y-6'>
			<div>
				<h1 className='text-2xl font-bold'>Customer Reviews</h1>
				<p className='text-sm text-muted-foreground mt-1'>
					Manage and reply to reviews for your store products.
				</p>
			</div>
			<SellerReviewsClient
				storeUrl={storeUrl}
				initialData={data}
				currentPage={currentPage}
				ratingFilter={ratingFilter}
				replyFilter={replyFilter}
			/>
		</div>
	);
}
