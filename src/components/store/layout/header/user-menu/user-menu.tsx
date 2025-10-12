import { MessageIcon, OrderIcon, WishlistIcon } from '@/components/store/icons';
import { Button } from '@/components/store/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SignOutButton, UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { ChevronDown, UserIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default async function UserMenu() {
	// Get the current user
	const user = await currentUser();
	return (
		<div className='relative group px-2 '>
			{/* Trigger */}
			<div>
				{user ? (
					<Image
						src={user.imageUrl}
						alt={user.fullName! || 'User'}
						width={40}
						height={40}
						className='w-10 h-10 object-cover rounded-full'
					/>
				) : (
					<div className='flex h-11 items-center py-0 mx-2 cursor-pointer'>
						<span className='text-2xl'>
							<UserIcon />
						</span>
						<div className='ml-1'>
							<span className='block text-xs text-white leading-3'>
								Welcome
							</span>
							<b className='font-bold text-xs text-white leading-4'>
								<span>Sign in / Register</span>
								<span className='text-white scale-[60%] align-middle inline-block'>
									<ChevronDown />
								</span>
							</b>
						</div>
					</div>
				)}
			</div>

			{/* Content */}
			<div
				className={cn(
					'hidden absolute top-0 -left-20 group-hover:block cursor-pointer overflow-clip',
					{
						'-left-[200px] lg:-left-[138px]': user,
					},
				)}
			>
				<div className='relative left-2 mt-10 pt-2.5 text-sm z-40 '>
					{/* Triangle */}
					<div className='w-0 h-0 absolute left-[149px] top-1 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-white dark:border-b-slate-800'></div>

					{/* Menu */}
					<div className='rounded-2xl backdrop-blur-md bg-white/80 dark:bg-slate-900/70 shadow-2xl border border-slate-200/60 dark:border-slate-700/40 transition-all duration-300'>
						<div className='w-[305px]'>
							<div className='pt-5 px-6 pb-0'>
								{user ? (
									<div className='flex flex-col items-center justify-center gap-2'>
										<UserButton />
									</div>
								) : (
									<div className='space-y-1'>
										<Link href='/sign-in'>
											<Button className='w-full bg-main-primary text-white hover:opacity-90'>
												Sign in
											</Button>
										</Link>
										<Link
											href='/sign-up'
											className='h-10 text-sm text-main-primary flex items-center justify-center hover:underline'
										>
											Register
										</Link>
									</div>
								)}

								{user && (
									<Button
										className='w-full h-10 my-4 text-sm bg-gradient-to-r from-red-500/90 to-pink-500/80 text-white hover:opacity-90 rounded-xl shadow-md'
										asChild
									>
										<SignOutButton />
									</Button>
								)}
								<Separator className='mt-3 dark:bg-slate-700/60' />
							</div>

							{/* Links */}
							<div className='max-h-[calc(100vh-200px)] overflow-y-auto pt-3 px-3 pb-4'>
								<ul className='grid grid-cols-3 gap-3 py-2'>
									{links.map((item) => (
										<li key={item.title} className='grid place-items-center'>
											<Link href={item.link} className='group space-y-2'>
												<div
													className='w-14 h-14 rounded-2xl p-2 grid place-items-center transition-all duration-300 
										bg-gray-100 hover:bg-gray-200 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 
										border border-transparent hover:border-slate-300/50 dark:hover:border-slate-600/50 
										shadow-sm hover:shadow-md'
												>
													<span className='text-slate-600 dark:text-slate-200 transition-transform duration-300 group-hover:scale-110'>
														{item.icon}
													</span>
												</div>
												<span className='block text-xs text-slate-600 dark:text-slate-300'>
													{item.title}
												</span>
											</Link>
										</li>
									))}
								</ul>

								<Separator className='!max-w-[257px] mx-auto dark:bg-slate-700/60' />

								<ul className='pt-3 pr-4 pb-2 pl-4 w-[288px] space-y-1.5'>
									{extraLinks.map((item, i) => (
										<li key={i}>
											<Link href={item.link}>
												<span className='block text-sm text-main-primary hover:underline hover:text-main-primary/80'>
													{item.title}
												</span>
											</Link>
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

const links = [
	{
		icon: <OrderIcon />,
		title: 'My Orders',
		link: '/profile/orders',
	},
	{
		icon: <MessageIcon />,
		title: 'Messages',
		link: '/profile/messages',
	},
	{
		icon: <WishlistIcon />,
		title: 'WishList',
		link: '/profile/wishlist',
	},
];
const extraLinks = [
	{
		title: 'Profile',
		link: '/profile',
	},
	{
		title: 'Settings',
		link: '/',
	},
	{
		title: 'Become a Seller',
		link: '/become-seller',
	},
	{
		title: 'Help Center',
		link: '',
	},
	{
		title: 'Return & Refund Policy',
		link: '/',
	},
	{
		title: 'Legal & Privacy',
		link: '',
	},
	{
		title: 'Discounts & Offers',
		link: '',
	},
	{
		title: 'Order Dispute Resolution',
		link: '',
	},
	{
		title: 'Report a Problem',
		link: '',
	},
];
