import CouponDetails from '@/components/dashboard/forms/coupon-details';

export default async function SellerNewCouponPage({
	params,
}: {
	params: { storeUrl: string };
}) {
	return (
		<div className='w-full'>
			<CouponDetails storeUrl={params.storeUrl} />
		</div>
	);
}
