'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/store/ui/button';

export default function NotFound() {
	const router = useRouter();

	return (
		<div className='relative flex flex-col items-center justify-center min-h-[90vh] px-6 py-12 text-center overflow-hidden bg-background text-foreground select-none'>
			{/* Decorative blurred background shapes */}
			<div className='absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none' />
			<div className='absolute bottom-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none' />

			{/* Floating Bag Animation */}
			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: [0, -12, 0], opacity: 1 }}
				transition={{
					y: {
						duration: 4,
						repeat: Infinity,
						ease: 'easeInOut',
					},
					opacity: {
						duration: 0.6,
					},
				}}
				className='relative mb-8'
			>
				<svg
					width='200'
					height='200'
					viewBox='0 0 200 200'
					fill='none'
					xmlns='http://www.w3.org/2000/svg'
					className='mx-auto filter drop-shadow-md'
				>
					{/* Grid backdrop pattern */}
					<defs>
						<pattern id='grid-pattern' width='20' height='20' patternUnits='userSpaceOnUse'>
							<path
								d='M 20 0 L 0 0 0 20'
								fill='none'
								stroke='currentColor'
								strokeWidth='0.5'
								className='text-neutral-200 dark:text-slate-800'
							/>
						</pattern>
					</defs>
					<rect width='100%' height='100%' fill='url(#grid-pattern)' opacity='0.3' />

					{/* Outer dotted circle */}
					<circle
						cx='100'
						cy='100'
						r='70'
						stroke='currentColor'
						strokeWidth='1'
						strokeDasharray='4 4'
						className='text-orange-primary/30'
					/>

					{/* Shopping Bag shape */}
					<path
						d='M60 70 L50 90 V145 C50 150.5 54.5 155 60 155 H140 C145.5 155 150 150.5 150 145 V90 L140 70 H60 Z'
						fill='currentColor'
						className='text-orange-background/5 dark:text-orange-background/10'
						stroke='currentColor'
						strokeWidth='3'
						strokeLinejoin='round'
					/>

					{/* Bag Handles */}
					<path
						d='M85 70 C85 50 115 50 115 70'
						stroke='currentColor'
						strokeWidth='3'
						strokeLinecap='round'
					/>

					{/* Cute lost expression face */}
					<circle cx='85' cy='105' r='4' fill='currentColor' className='text-orange-primary' />
					<circle cx='115' cy='105' r='4' fill='currentColor' className='text-orange-primary' />
					<path
						d='M93 125 C95 121 105 121 107 125'
						stroke='currentColor'
						strokeWidth='2.5'
						strokeLinecap='round'
						className='text-orange-primary'
					/>

					{/* Small floating sparkles */}
					<circle cx='45' cy='65' r='3' fill='currentColor' className='text-orange-primary/40' />
					<circle cx='155' cy='135' r='4' fill='currentColor' className='text-blue-primary/40' />
					<path d='M145 55 L148 58 L145 61 L142 58 Z' fill='currentColor' className='text-orange-primary/40' />
				</svg>
			</motion.div>

			{/* Typography Section */}
			<motion.div
				initial={{ opacity: 0, y: 15 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.2 }}
				className='space-y-4 max-w-lg relative z-10'
			>
				<h1 className='text-7xl font-extrabold tracking-tight bg-gradient-to-r from-orange-primary via-orange-background to-orange-hover bg-clip-text text-transparent'>
					404
				</h1>
				<h2 className='text-2xl font-bold tracking-tight text-main-primary'>
					Lost in the Aisles?
				</h2>
				<p className='text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed'>
					The page you are looking for has checked out or moved to a different aisle. Let&apos;s get you back on track.
				</p>
			</motion.div>

			{/* CTA Action Buttons */}
			<motion.div
				initial={{ opacity: 0, y: 15 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.4 }}
				className='flex flex-wrap gap-4 mt-10 justify-center relative z-10'
			>
				<Button
					onClick={() => router.back()}
					variant='unstyled'
					className='inline-flex items-center justify-center gap-x-2 px-6 h-12 rounded-full border border-border bg-background hover:bg-f5 text-main-primary text-sm font-semibold transition-all duration-200 cursor-pointer'
				>
					<ArrowLeft className='w-4 h-4' />
					Go Back
				</Button>

				<Link
					href='/'
					className='inline-flex items-center justify-center gap-x-2 px-6 h-12 rounded-full bg-gradient-to-r from-orange-primary to-orange-hover hover:from-orange-hover hover:to-orange-primary text-white text-sm font-semibold transition-all duration-300 shadow-md shadow-orange-500/10 cursor-pointer'
				>
					<Home className='w-4 h-4' />
					Back to Home
				</Link>

				<Link
					href='/browse'
					className='inline-flex items-center justify-center gap-x-2 px-6 h-12 rounded-full border border-border bg-background hover:bg-f5 text-main-primary text-sm font-semibold transition-all duration-200 cursor-pointer'
				>
					<ShoppingBag className='w-4 h-4' />
					Browse Products
				</Link>
			</motion.div>
		</div>
	);
}
