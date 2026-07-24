'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard, ChevronRight } from 'lucide-react';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Map segment keys to clean readable display labels
const labelMap: Record<string, string> = {
	dashboard: 'Dashboard',
	admin: 'Admin',
	seller: 'Seller',
	stores: 'Stores',
	categories: 'Categories',
	subCategories: 'Sub Categories',
	'offer-tags': 'Offer Tags',
	orders: 'Orders',
	products: 'Products',
	coupons: 'Coupons',
	shipping: 'Shipping',
	settings: 'Settings',
	analytics: 'Analytics',
	new: 'New',
	edit: 'Edit Details',
	details: 'Details',
};

function formatSegmentLabel(segment: string): string {
	if (labelMap[segment]) return labelMap[segment];

	// Detect CUIDs, UUIDs, or long database ID strings
	if (/^[a-z0-9]{20,}$/i.test(segment) || /^[0-9a-f-]{36}$/i.test(segment)) {
		return 'Details';
	}

	// Convert hyphenated slugs ("crafted-compass" -> "Crafted Compass")
	return segment
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

export default function DashboardBreadcrumbs() {
	const pathname = usePathname();

	// Split pathname into clean segments
	const segments = pathname.split('/').filter(Boolean);

	const items: { label: string; href: string }[] = [];
	let currentPath = '';

	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		currentPath += `/${seg}`;

		// Skip 'dashboard' if followed by admin or seller to avoid redundant links
		if (
			seg === 'dashboard' &&
			segments.length > 1 &&
			(segments[1] === 'admin' || segments[1] === 'seller')
		) {
			continue;
		}

		// Skip 'stores' right after 'seller' since 'seller' points to /dashboard/seller/stores
		if (seg === 'stores' && i > 0 && segments[i - 1] === 'seller') {
			continue;
		}

		let label = formatSegmentLabel(seg);
		let targetHref = currentPath;

		if (seg === 'admin') {
			label = 'Admin';
			targetHref = '/dashboard/admin';
		} else if (seg === 'seller') {
			label = 'Seller';
			targetHref = '/dashboard/seller/stores';
		}

		items.push({
			label,
			href: targetHref,
		});
	}

	return (
		<Breadcrumb>
			<BreadcrumbList className='text-xs font-medium text-muted-foreground gap-1.5 sm:gap-2'>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link
							href='/'
							className='flex items-center gap-1 hover:text-foreground transition-colors'
						>
							<Home className='w-3.5 h-3.5' />
							<span className='hidden sm:inline'>Home</span>
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>

				{items.map((item, index) => {
					const isLast = index === items.length - 1;

					return (
						<div key={item.href + index} className='flex items-center gap-1.5 sm:gap-2'>
							<BreadcrumbSeparator className='[&>svg]:w-3 [&>svg]:h-3'>
								<ChevronRight />
							</BreadcrumbSeparator>
							<BreadcrumbItem>
								{isLast ? (
									<BreadcrumbPage className='font-semibold text-primary text-xs flex items-center gap-1'>
										{index === 0 && <LayoutDashboard className='w-3.5 h-3.5' />}
										<span>{item.label}</span>
									</BreadcrumbPage>
								) : (
									<BreadcrumbLink asChild>
										<Link
											href={item.href}
											className='hover:text-foreground transition-colors text-xs'
										>
											{item.label}
										</Link>
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
						</div>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
