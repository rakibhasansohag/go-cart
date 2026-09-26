import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import UserMenuClient, { UserMenuRoleLink } from './user-menu-client';

export default async function UserMenu() {
	const { userId } = await auth();
	let user = null;
	if (userId) {
		try {
			user = await db.user.findUnique({
				where: { id: userId },
				select: { name: true, picture: true, role: true },
			});
		} catch (error) {
			console.warn('Unable to load the local user menu profile:', error);
		}
	}

	const roleLink: UserMenuRoleLink =
		user?.role === 'ADMIN'
			? { title: 'Go to Admin dashboard', link: '/dashboard/admin' }
			: user?.role === 'SELLER'
				? { title: 'Go to Seller dashboard', link: '/dashboard/seller' }
				: { title: 'Become a Seller', link: '/seller/apply' };

	return <UserMenuClient user={user} roleLink={roleLink} />;
}
