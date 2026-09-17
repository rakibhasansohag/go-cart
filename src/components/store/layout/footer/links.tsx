import { SubCategory } from '@prisma/client';
import Link from 'next/link';

interface FooterLinkItem {
	title: string;
	link: string;
}

const PROFILE_LINKS: FooterLinkItem[] = [
	{
		title: 'My Account',
		link: '/profile',
	},
	{
		title: 'My Orders',
		link: '/profile/orders',
	},
	{
		title: 'Wishlist',
		link: '/profile/wishlist',
	},
	{
		title: 'Loyalty Rewards',
		link: '/profile/rewards',
	},
	{
		title: 'Returns & Refunds',
		link: '/profile/returns',
	},
	{
		title: 'Followed Stores',
		link: '/profile/following',
	},
];

const CUSTOMER_CARE_LINKS: FooterLinkItem[] = [
	{
		title: 'About Us',
		link: '/about',
	},
	{
		title: 'Contact Us',
		link: '/contact',
	},
	{
		title: 'Documentation Hub',
		link: '/documentation',
	},
	{
		title: 'Track Your Order',
		link: '/track-order',
	},
	{
		title: 'FAQs & Support',
		link: '/faq',
	},
	{
		title: 'Privacy Policy',
		link: '/privacy',
	},
	{
		title: 'Terms of Service',
		link: '/terms',
	},
];

export default function Links({ subs }: { subs: SubCategory[] }) {
	return (
		<div className='grid md:grid-cols-3 gap-6 mt-5 text-sm'>
			{/* SubCategories */}
			<div className='space-y-3'>
				<h2 className='text-base font-bold text-foreground'>Find it Fast</h2>
				<ul className='flex flex-col gap-y-1.5'>
					{subs.map((sub) => (
						<li key={sub.id}>
							<Link
								href={`/browse?subCategory=${sub.url}`}
								className='text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-150'
							>
								{sub.name}
							</Link>
						</li>
					))}
				</ul>
			</div>

			{/* Profile links */}
			<div className='space-y-3'>
				<h2 className='text-base font-bold text-foreground'>Account & Orders</h2>
				<ul className='flex flex-col gap-y-1.5'>
					{PROFILE_LINKS.map((link) => (
						<li key={link.link}>
							<Link
								href={link.link}
								className='text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-150'
							>
								{link.title}
							</Link>
						</li>
					))}
				</ul>
			</div>

			{/* Customer care */}
			<div className='space-y-3'>
				<h2 className='text-base font-bold text-foreground'>Customer Care & Info</h2>
				<ul className='flex flex-col gap-y-1.5'>
					{CUSTOMER_CARE_LINKS.map((link) => (
						<li key={link.link}>
							<Link
								href={link.link}
								className='text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-150'
							>
								{link.title}
							</Link>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

