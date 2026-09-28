import { SimpleProduct } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '../../../ui/button';
import UserCardProducts from './products';

export default function HomeUserCard({
	products,
	user,
}: {
	products: SimpleProduct[];
	user: {
		imageUrl: string;
		fullName: string | null;
		role?: string;
	} | null;
}) {
	const role = user?.role;
	return (
		<div className='h-full hidden min-[1170px]:block relative bg-background rounded-md shadow-sm overflow-hidden'>
			<div
				className='h-full rounded-md bg-no-repeat pb-3 flex flex-col justify-between'
				style={{
					backgroundImage: 'url(/assets/images/user-card-bg.avif)',
					backgroundSize: '100% 101px',
				}}
			>
				{/*User info */}
				<div className='w-full h-[76px]'>
					<div className='mx-auto cursor-pointer'>
						<Image
							src={user ? user.imageUrl : '/assets/images/default-user.avif'}
							alt=''
							width={48}
							height={48}
							className='h-12 w-12 rounded-full object-cover absolute left-1/2 -translate-x-1/2 top-2'
						/>
					</div>
					<div className='absolute top-16 w-full h-5 font-bold text-slate-800 dark:text-slate-900 text-center cursor-pointer capitalize'>
						{user ? user.fullName?.toLowerCase() : 'Welcome to GoCart'}
					</div>
				</div>
				{/* User links */}
				<div className='w-full h-[100px] flex items-center gap-x-4 justify-center mt-4'>
					<Link href='/profile'>
						<span
							className='relative block w-12 h-12 mx-auto bg-cover bg-no-repeat'
							style={{
								backgroundImage: 'url(/assets/images/user-card/user.webp)',
							}}
						/>
						<span className='w-full max-h-7 text-xs text-main-primary text-center'>
							Account
						</span>
					</Link>
					<Link href='/profile/orders'>
						<span
							className='relative block w-12 h-12 mx-auto bg-cover bg-no-repeat'
							style={{
								backgroundImage: 'url(/assets/images/user-card/orders.webp)',
							}}
						/>
						<span className='w-full max-h-7 text-xs text-main-primary text-center pl-1'>
							Orders
						</span>
					</Link>
					<Link href='/profile/wishlist'>
						<span
							className='relative block w-12 h-12 mx-auto bg-cover bg-no-repeat'
							style={{
								backgroundImage: 'url(/assets/images/user-card/wishlist.webp)',
							}}
						/>
						<span className='w-full max-h-7 text-xs text-main-primary text-center'>
							Wishlist
						</span>
					</Link>
				</div>
				{/* Action btn */}
				<div className='w-full px-2'>
					{user ? (
						<div className='w-full'>
							{role === 'ADMIN' ? (
								<Button variant='orange-gradient' className='rounded-md'>
									<Link href={'/dashboard/admin'}>
										Switch to Admin Dashboard
									</Link>
								</Button>
							) : role === 'SELLER' ? (
								<Button variant='orange-gradient' className='rounded-md'>
									<Link href={'/dashboard/seller'}>
										Switch to Seller Dashboard
									</Link>
								</Button>
							) : (
								<Button variant='orange-gradient' className='rounded-md'>
									<Link href={'/seller/apply'}>Apply to become a seller</Link>
								</Button>
							)}
						</div>
					) : (
						<div className='w-full flex justify-between gap-x-4'>
							<Button variant='orange-gradient'>
								<Link href='/sign-up'>Join</Link>
							</Button>
							<Button variant='gray'>
								<Link href='/sign-in'>Sign in</Link>
							</Button>
						</div>
					)}
				</div>
				{/* Ad section */}
				<div className='w-full flex-1 px-2 min-h-0 flex flex-col mt-2'>
					<div
						className='w-full h-full min-h-[200px] p-2.5 bg-f5 bg-cover rounded-xl relative flex flex-col justify-between overflow-hidden shadow-sm'
						style={{
							backgroundImage: 'url(/assets/images/ads/user-card-ad.png)',
							backgroundPosition: 'center',
						}}
					>
						<Link href='/browse' className='group/deals block'>
							<div className='mt-1 text-slate-700 dark:text-slate-200 leading-[18px] text-xs font-semibold tracking-wide uppercase'>
								Your favorite store
							</div>
							<div className='leading-5 font-bold mt-1 text-slate-900 dark:text-white group-hover/deals:text-orange-500 transition-colors flex items-center gap-1 text-sm'>
								Check out the latest new deals
								<ChevronRight className='size-3.5 transition-transform group-hover/deals:translate-x-0.5' />
							</div>
						</Link>
						<UserCardProducts products={products} />
					</div>
				</div>
			</div>
		</div>
	);
}
