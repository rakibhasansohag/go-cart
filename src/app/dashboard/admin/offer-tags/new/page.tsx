'use client';

import OfferTagDetails from '@/components/dashboard/forms/offer-tag-details';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminOfferTagsPage() {
	const router = useRouter();

	const handleBack = () => {
		// Check if the browser supports the history API
		if (typeof window !== 'undefined' && window.history.length > 1) {
			router.back();
		} else {
			router.push('/dashboard');
		}
	};

	return (
		<div className='w-full'>
			<div>
				<Button className='mb-4' onClick={handleBack}>
					<ArrowLeft className='mr-2 h-4 w-4' /> Back
				</Button>
			</div>

			<div className='mb-4'>
				<h1 className='text-3xl font-bold'>Create offer tag</h1>
			</div>

			<OfferTagDetails />
		</div>
	);
}
