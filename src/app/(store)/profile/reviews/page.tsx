import ReviewsContainer from '@/components/store/profile/reviews/reviews-container';
import { getUserReviews } from '@/queries/profile';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function ProfileReviewsPage() {
	const user = currentUser();
	if (!user) {
		// send user to sign-in
		redirect(`/sign-in?redirect=/profile/reviews`);
	}

	const reviews_data = await getUserReviews();
	const { reviews, totalPages } = reviews_data;
	return (
		<div className='bg-background py-4 px-6 rounded-xl'>
			<h1 className='text-lg mb-1 font-bold'>Your reviews</h1>
			<ReviewsContainer reviews={reviews} totalPages={totalPages} />
		</div>
	);
}
