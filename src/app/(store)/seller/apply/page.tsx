export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/seo/page-metadata';
import MinimalHeader from '@/components/store/layout/minimal-header/header';
import ApplySellerMultiForm from '@/components/store/forms/apply-seller/apply-seller';

export const metadata: Metadata = publicPageMetadata(
	'/seller/apply',
	'Become a Seller',
	'Open your own store on GoCart. Apply as a seller to list products, manage orders and inventory, and receive payouts through Stripe Connect.',
);

export default function SellerApplyPage() {
	return (
		<div className='bg-[#eef4fc] dark:bg-[#191520] h-screen overflow-y-hidden'>
			<MinimalHeader />
			<h1 className='sr-only'>Apply to become a seller on GoCart</h1>
			<ApplySellerMultiForm />
		</div>
	);
}
