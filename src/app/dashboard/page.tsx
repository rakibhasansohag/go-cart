import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';

export default async function DashboardPage() {
	const user = await currentUser();

	// debug
	// console.log(
	// 	'[dashboard] server user:',
	// 	!!user,
	// 	'id=',
	// 	user?.id,
	// 	'role=',
	// 	user?.privateMetadata?.role,
	// );

	if (!user) {
		// If no user on server, send them to sign-in
		return redirect(
			`/sign-in?redirect_url=${encodeURIComponent('/dashboard')}`,
		);
	}

	const role = (user?.privateMetadata?.role || '').toString().toUpperCase();

	if (role === 'ADMIN') {
		return redirect('/dashboard/admin');
	}

	if (role === 'SELLER') {
		return redirect('/dashboard/seller');
	}

	// Customers and users do not have a dashboard. Send them to the profile
	// workspace instead of rendering the dashboard 404 boundary.
	return redirect('/profile');
}
