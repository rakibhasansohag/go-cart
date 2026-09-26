'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, UserIcon } from 'lucide-react';
import { SignOutButton, UserButton } from '@clerk/nextjs';
import { Role } from '@prisma/client';

import { MessageIcon, OrderIcon, WishlistIcon } from '@/components/store/icons';
import { Button } from '@/components/store/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger, PopoverArrow } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface UserMenuProfile {
	name: string | null;
	picture: string;
	role: Role;
}

export interface UserMenuRoleLink {
	title: string;
	link: string;
}

export interface UserMenuClientProps {
	user: UserMenuProfile | null;
	roleLink: UserMenuRoleLink;
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
		link: '/profile/settings',
	},
	{
		title: 'Help Center',
		link: '#',
	},
	{
		title: 'Return & Refund Policy',
		link: '/',
	},
	{
		title: 'Legal & Privacy',
		link: '#',
	},
	{
		title: 'Discounts & Offers',
		link: '#',
	},
	{
		title: 'Order Dispute Resolution',
		link: '#',
	},
	{
		title: 'Report a Problem',
		link: '#',
	},
];

export default function UserMenuClient({ user, roleLink }: UserMenuClientProps) {
	const [isOpen, setIsOpen] = useState(false);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const clearHoverTimeout = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	};

	const handleMouseEnter = () => {
		if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
			clearHoverTimeout();
			setIsOpen(true);
		}
	};

	const handleMouseLeave = () => {
		if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
			clearHoverTimeout();
			timeoutRef.current = setTimeout(() => {
				setIsOpen(false);
			}, 250);
		}
	};

	useEffect(() => {
		return () => {
			clearHoverTimeout();
		};
	}, []);

	const handleTriggerClick = (e: React.MouseEvent) => {
		e.preventDefault();
		clearHoverTimeout();
		setIsOpen((prev) => !prev);
	};

	return (
		<div
			className='relative px-0.5 sm:px-1'
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<Popover
				open={isOpen}
				onOpenChange={(open) => {
					clearHoverTimeout();
					setIsOpen(open);
				}}
			>
				<PopoverTrigger asChild>
					<button
						type='button'
						onClick={handleTriggerClick}
						aria-label={user ? (user.name || 'User Account') : 'User Account'}
						aria-expanded={isOpen}
						className='flex h-11 items-center py-0 px-1 sm:px-1.5 cursor-pointer text-white border-none outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg select-none transition-opacity hover:opacity-90'
					>
						{user ? (
							<Image
								src={user.picture}
								alt={user.name || 'User'}
								width={40}
								height={40}
								className='w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 object-cover rounded-full ring-2 ring-white/20'
							/>
						) : (
							<div className='flex items-center'>
								<span className='text-2xl flex items-center justify-center shrink-0'>
									<UserIcon className='w-6 h-6' />
								</span>
								<div className='ml-1 hidden md:block text-left'>
									<span className='block text-xs text-white/80 leading-3'>
										Welcome
									</span>
									<b className='font-bold text-xs text-white leading-4 whitespace-nowrap flex items-center gap-0.5'>
										<span>Sign in / Register</span>
										<span
											className={cn(
												'text-white scale-[60%] align-middle inline-block transition-transform duration-200',
												isOpen && 'rotate-180',
											)}
										>
											<ChevronDown />
										</span>
									</b>
								</div>
							</div>
						)}
					</button>
				</PopoverTrigger>

				<PopoverContent
					align='center'
					sideOffset={8}
					collisionPadding={16}
					arrowPadding={16}
					className='w-auto p-0 border-none bg-transparent shadow-none z-50 focus:outline-none'
				>
					{/* Radix dynamic indicator arrow: accurately follows trigger across desktop, tablet, and mobile */}
					<PopoverArrow
						className='fill-white dark:fill-slate-900 drop-shadow-[0_-1px_1px_rgba(0,0,0,0.12)] z-50'
						width={14}
						height={7}
					/>

					{/* Invisible hover bridge to prevent cursor gap drop */}
					<div
						className='absolute -top-3 left-0 right-0 h-4 bg-transparent'
						onMouseEnter={handleMouseEnter}
					/>

					<div
						onMouseEnter={handleMouseEnter}
						onMouseLeave={handleMouseLeave}
						className='relative rounded-2xl backdrop-blur-md bg-white/95 dark:bg-slate-900/95 shadow-2xl border border-slate-200/80 dark:border-slate-700/60 w-[305px] max-w-[calc(100vw-32px)] overflow-hidden transition-all'
					>

						{/* User Status / Auth Actions */}
						<div className='pt-5 px-6 pb-0'>
							{user ? (
								<div className='flex flex-col items-center justify-center gap-2'>
									<UserButton />
									<div className='text-center mt-1'>
										<p className='text-sm font-bold text-main-primary dark:text-white line-clamp-1'>
											{user.name || 'Account'}
										</p>
										<span className='text-xs text-muted-foreground capitalize'>
											{user.role?.toLowerCase()}
										</span>
									</div>
								</div>
							) : (
								<div className='space-y-2'>
									<Link href='/sign-in' onClick={() => setIsOpen(false)}>
										<Button
											variant='orange-gradient'
											className='w-full h-10 font-bold text-white shadow-md rounded-xl hover:opacity-90'
										>
											Sign in
										</Button>
									</Link>
									<Link
										href='/sign-up'
										onClick={() => setIsOpen(false)}
										className='h-10 text-sm font-semibold text-main-primary hover:text-orange-background flex items-center justify-center transition-colors'
									>
										Register
									</Link>
								</div>
							)}

							{user && (
								<Button
									className='w-full h-10 my-4 text-sm bg-gradient-to-r from-red-500/90 to-pink-500/80 text-white hover:opacity-90 rounded-xl shadow-md'
									asChild
									onClick={() => setIsOpen(false)}
								>
									<SignOutButton />
								</Button>
							)}
							<Separator className='mt-3 dark:bg-slate-700/60' />
						</div>

						{/* Quick Links Grid */}
						<div className='max-h-[calc(100vh-200px)] overflow-y-auto overflow-x-hidden pt-3 px-3 pb-4 scrollbar'>
							<ul className='grid grid-cols-3 gap-3 py-2'>
								{links.map((item) => (
									<li key={item.title} className='grid place-items-center'>
										<Link
											href={item.link}
											onClick={() => setIsOpen(false)}
											className='group/link space-y-2 flex flex-col items-center'
										>
											<div
												className='w-14 h-14 rounded-2xl p-2 grid place-items-center transition-all duration-200 
												bg-gray-100 hover:bg-gray-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 
												border border-transparent hover:border-slate-300/50 dark:hover:border-slate-600/50 
												shadow-sm hover:shadow-md'
											>
												<span className='text-slate-600 dark:text-slate-200 transition-transform duration-200 group-hover/link:scale-110'>
													{item.icon}
												</span>
											</div>
											<span className='block text-xs text-center text-slate-600 dark:text-slate-300 font-medium'>
												{item.title}
											</span>
										</Link>
									</li>
								))}
							</ul>

							<Separator className='!max-w-[257px] mx-auto dark:bg-slate-700/60 my-2' />

							{/* Extra navigation links */}
							<ul className='pt-2 pr-4 pb-2 pl-4 w-full space-y-2'>
								{[roleLink, ...extraLinks].map((item) => (
									<li key={item.title}>
										<Link href={item.link} onClick={() => setIsOpen(false)}>
											<span className='block text-sm text-main-primary dark:text-slate-200 hover:underline hover:text-primary transition-colors'>
												{item.title}
											</span>
										</Link>
									</li>
								))}
							</ul>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
