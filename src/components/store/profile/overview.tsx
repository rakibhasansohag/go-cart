import { currentUser } from '@clerk/nextjs/server';
import { Eye, Heart, Puzzle, Rss, WalletCards } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default async function ProfileOverview() {
	const user = await currentUser();
	

	if (!user) return;
	return (
		<div className='w-full'>
			<div className='bg-background p-4 border shadow-sm'>
				<div className='flex items-center'>
					<Image
						src={user.imageUrl}
						alt={user.fullName || 'User'}
						width={200}
						height={200}
						className='w-14 h-14 rounded-full object-cover'
					/>
					<div className='flex-1 ml-4 text-main-primary text-xl font-bold capitalize'>
						{user.fullName?.toLowerCase() ||
							user.emailAddresses[0]?.emailAddress.split('@')[0]}
					</div>
				</div>
				<div className='mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 p-4'>
					{menu.map((item) => (
						<Link
							key={item.link}
							href={item.link}
							className='w-36 relative flex flex-col items-center justify-center cursor-pointer'
						>
							<div className='text-3xl'>
								<span>{item.icon}</span>
							</div>
							<div className='mt-2'>{item.title}</div>
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}

const menu = [
	{
		title: 'Wishlist',
		icon: <Heart />,
		link: '/profile/wishlist',
	},
	{
		title: 'Following',
		icon: <Rss />,
		link: '/profile/following/1',
	},
	{
		title: 'Viewed',
		icon: <Eye />,
		link: '/profile/history/1',
	},
	{
		title: 'Coupons',
		icon: <Puzzle />,
		link: '/profile/coupons',
	},
	{
		title: 'Shopping credit',
		icon: <WalletCards />,
		link: '/profile/credit',
	},
];
