import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';

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

	if (!role || role === 'USER') {
		return redirect('/');
	}

	if (role === 'ADMIN') {
		return redirect('/dashboard/admin');
	}

	if (role === 'SELLER') {
		return redirect('/dashboard/seller');
	}

	// fallback
	return notFound();
}
