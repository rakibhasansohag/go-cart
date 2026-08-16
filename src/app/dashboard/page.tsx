import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export default async function DashboardPage() {
	const { userId } = await auth();
	if (!userId) {
		return redirect(
			`/sign-in?redirect_url=${encodeURIComponent('/dashboard')}`,
		);
	}
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { role: true },
	});
	const role = user?.role;

	if (role === 'ADMIN') {
		return redirect('/dashboard/admin');
	}

	if (role === 'SELLER') {
		return redirect('/dashboard/seller');
	}

	return redirect('/profile');
}
