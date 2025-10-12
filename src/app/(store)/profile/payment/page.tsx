import PaymentsTable from '@/components/store/profile/payments/payments-table';
import { getUserPayments } from '@/queries/profile';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function ProfilePaymentPage() {
	const user = await currentUser();
	console.log('server currentUser() =>', !!user, user?.id);
	if (!user) {
		// send user to sign-in
		redirect(`/sign-in?redirect=/profile/payment`);
	}

	const payments_data = await getUserPayments();

	const { payments, totalPages } = payments_data;
	return (
		<div>
			<PaymentsTable payments={payments} totalPages={totalPages} />
		</div>
	);
}
