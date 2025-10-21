import MinimalHeader from '@/components/store/layout/minimal-header/header';
import ApplySellerMultiForm from '@/components/store/forms/apply-seller/apply-seller';

export default function SellerApplyPage() {
	return (
		<div className='bg-[#eef4fc] dark:bg-[#191520] h-screen overflow-y-hidden'>
			<MinimalHeader />
			<ApplySellerMultiForm />
		</div>
	);
}
