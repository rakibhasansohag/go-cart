'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, ShoppingBag, Compass, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
	const router = useRouter();

	return (
		<div className='relative flex flex-col items-center justify-center min-h-[85vh] px-6 py-12 text-center overflow-hidden bg-background text-foreground select-none'>
			{/* Ambient background glows */}
			<div className='absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-[120px] pointer-events-none' />
			<div className='absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-12 w-[30rem] h-[30rem] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none' />

			{/* Animated Illustration */}
			<motion.div
				initial={{ scale: 0.9, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ duration: 0.5, ease: 'easeOut' }}
				className='relative mb-8'
			>
				<motion.div
					animate={{ y: [0, -10, 0] }}
					transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
					className='relative w-36 h-36 sm:w-44 sm:h-44 mx-auto flex items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-blue-500/20 dark:border-blue-500/30 shadow-2xl backdrop-blur-md'
				>
					<Compass className='w-20 h-20 sm:w-24 sm:h-24 text-blue-500 animate-pulse' />
					<div className='absolute -bottom-2 -right-2 bg-background border border-border p-2.5 rounded-2xl shadow-lg'>
						<Search className='w-5 h-5 text-muted-foreground' />
					</div>
				</motion.div>
			</motion.div>

			{/* Typography Section */}
			<motion.div
				initial={{ opacity: 0, y: 15 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.2 }}
				className='space-y-4 max-w-md relative z-10'
			>
				<div className='inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold tracking-wide uppercase border border-blue-500/20'>
					Error 404 — Page Not Found
				</div>

				<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground'>
					Lost in the Aisles?
				</h1>
				<p className='text-muted-foreground text-sm sm:text-base leading-relaxed'>
					The page you are looking for doesn&apos;t exist or may have been moved. Let&apos;s get you back on track!
				</p>
			</motion.div>

			{/* CTA Action Buttons */}
			<motion.div
				initial={{ opacity: 0, y: 15 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.3 }}
				className='flex flex-wrap items-center justify-center gap-3.5 mt-8 relative z-10'
			>
				<Button
					type='button'
					onClick={() => router.back()}
					variant='outline'
					className='inline-flex items-center justify-center gap-x-2 px-5 h-11 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer hover:bg-accent'
				>
					<ArrowLeft className='w-4 h-4' />
					Go Back
				</Button>

				<Link
					href='/'
					className='inline-flex items-center justify-center gap-x-2 px-6 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all duration-200 shadow-md shadow-blue-500/20 cursor-pointer'
				>
					<Home className='w-4 h-4' />
					Back to Home
				</Link>

				<Link
					href='/browse'
					className='inline-flex items-center justify-center gap-x-2 px-5 h-11 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-sm font-medium transition-all duration-200 cursor-pointer'
				>
					<ShoppingBag className='w-4 h-4' />
					Browse Products
				</Link>
			</motion.div>
		</div>
	);
}
