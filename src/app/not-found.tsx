'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
	ArrowLeft,
	Home,
	ShoppingBag,
	Search,
	ShoppingCart,
	LayoutDashboard,
	HelpCircle,
	PackageSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NotFound() {
	const router = useRouter();
	const pathname = usePathname();
	const [searchQuery, setSearchQuery] = useState('');

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			router.push(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
		}
	};

	const isDashboardRoute = pathname?.startsWith('/dashboard');

	return (
		<div className='relative flex flex-col items-center justify-center min-h-[85vh] px-4 py-12 text-center overflow-hidden bg-background text-foreground select-none'>
			{/* Ambient Background Glows */}
			<div className='absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[140px] pointer-events-none' />
			<div className='absolute bottom-1/3 left-1/2 -translate-x-1/2 translate-y-12 w-[32rem] h-[32rem] bg-accent/20 rounded-full blur-[160px] pointer-events-none' />

			<div className='relative z-10 max-w-xl w-full flex flex-col items-center space-y-6'>
				{/* 404 Illustration Badge */}
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ duration: 0.4, ease: 'easeOut' }}
					className='relative'
				>
					<div className='w-24 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center rounded-3xl bg-card border border-border shadow-xl backdrop-blur-md relative'>
						<PackageSearch className='w-12 h-12 sm:w-14 sm:h-14 text-primary' />
						<div className='absolute -bottom-2 -right-2 bg-destructive/10 border border-destructive/20 p-2 rounded-xl text-destructive shadow-md'>
							<HelpCircle className='w-4 h-4' />
						</div>
					</div>
				</motion.div>

				{/* Error Header */}
				<motion.div
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.15 }}
					className='space-y-3 w-full'
				>
					<div className='inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase border border-primary/20'>
						404 — Page Not Found
					</div>

					<h1 className='text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground'>
						Looking for Something Specific?
					</h1>

					<p className='text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed'>
						The page or resource you requested is not available. Check the route or search our catalog below.
					</p>

					{/* Attempted Path Breadcrumb Indicator */}
					{pathname && (
						<div className='mt-3 inline-flex items-center gap-2 max-w-full px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground font-mono truncate'>
							<span className='font-semibold text-foreground shrink-0'>Attempted URL:</span>
							<span className='truncate text-primary'>{pathname}</span>
						</div>
					)}
				</motion.div>

				{/* Catalog Quick Search */}
				<motion.form
					onSubmit={handleSearch}
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.25 }}
					className='relative w-full max-w-md mt-2'
				>
					<Search className='absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none' />
					<Input
						type='text'
						placeholder='Search products, categories, or stores...'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className='h-11 pl-10 pr-24 rounded-xl bg-card border-border shadow-xs text-sm focus-visible:ring-1 focus-visible:ring-primary'
					/>
					<Button
						type='submit'
						size='sm'
						className='absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-3.5 text-xs font-semibold rounded-lg'
					>
						Search
					</Button>
				</motion.form>

				{/* E-Commerce Action Links Grid */}
				<motion.div
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.35 }}
					className='grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md pt-2'
				>
					<Button
						type='button'
						onClick={() => router.back()}
						variant='outline'
						className='flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-xs font-medium border-border hover:bg-accent'
					>
						<ArrowLeft className='w-3.5 h-3.5' />
						Go Back
					</Button>

					<Link href='/' className='w-full'>
						<Button
							type='button'
							variant='outline'
							className='w-full flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-xs font-medium border-border hover:bg-accent'
						>
							<Home className='w-3.5 h-3.5' />
							Home
						</Button>
					</Link>

					<Link href='/browse' className='w-full'>
						<Button
							type='button'
							variant='default'
							className='w-full flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-xs font-semibold shadow-xs'
						>
							<ShoppingBag className='w-3.5 h-3.5' />
							Browse Catalog
						</Button>
					</Link>

					<Link href='/cart' className='w-full'>
						<Button
							type='button'
							variant='outline'
							className='w-full flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-xs font-medium border-border hover:bg-accent'
						>
							<ShoppingCart className='w-3.5 h-3.5' />
							Cart
						</Button>
					</Link>

					{isDashboardRoute ? (
						<Link href='/dashboard/seller' className='col-span-2 sm:col-span-2 w-full'>
							<Button
								type='button'
								variant='secondary'
								className='w-full flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-xs font-medium'
							>
								<LayoutDashboard className='w-3.5 h-3.5' />
								Seller Dashboard
							</Button>
						</Link>
					) : (
						<Link href='/dashboard/seller' className='col-span-2 sm:col-span-2 w-full'>
							<Button
								type='button'
								variant='outline'
								className='w-full flex items-center justify-center gap-2 h-10 px-3 rounded-xl text-xs font-medium border-border hover:bg-accent'
							>
								<LayoutDashboard className='w-3.5 h-3.5' />
								Seller Dashboard
							</Button>
						</Link>
					)}
				</motion.div>
			</div>
		</div>
	);
}
