'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, Home, RefreshCw, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logEvent } from '@/lib/observability/logger';

interface ErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
	useEffect(() => {
		logEvent('error', 'app_render_error', {
			name: error.name,
			message: error.message,
			digest: error.digest,
		});
	}, [error]);

	return (
		<div className='relative flex flex-col items-center justify-center min-h-[80vh] px-4 py-12 text-center overflow-hidden bg-background text-foreground select-none'>
			{/* Ambient Background Glow */}
			<div className='absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-destructive/10 rounded-full blur-[140px] pointer-events-none' />

			<div className='relative z-10 max-w-lg w-full flex flex-col items-center space-y-6'>
				{/* Warning Illustration Badge */}
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ duration: 0.4, ease: 'easeOut' }}
					className='relative'
				>
					<div className='w-20 h-20 sm:w-24 sm:h-24 mx-auto flex items-center justify-center rounded-3xl bg-card border border-destructive/20 shadow-xl backdrop-blur-md'>
						<AlertTriangle className='w-10 h-10 sm:w-12 sm:h-12 text-destructive' />
					</div>
				</motion.div>

				{/* Error Header */}
				<motion.div
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
					className='space-y-3 w-full'
				>
					<div className='inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold tracking-wider uppercase border border-destructive/20'>
						Application Error
					</div>

					<h1 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground'>
						Something Went Wrong
					</h1>

					<p className='text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed'>
						An unexpected issue prevented this page from loading. You can retry the request or navigate back to safety.
					</p>

					{error.digest && (
						<div className='mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground font-mono'>
							<span>Reference ID:</span>
							<span className='text-foreground font-semibold'>{error.digest}</span>
						</div>
					)}
				</motion.div>

				{/* Recovery Actions */}
				<motion.div
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.2 }}
					className='grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-sm pt-2'
				>
					<Button
						type='button'
						onClick={() => reset()}
						variant='default'
						className='w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-semibold'
					>
						<RefreshCw className='w-3.5 h-3.5' />
						Try Again
					</Button>

					<Button
						type='button'
						onClick={() => window.location.reload()}
						variant='outline'
						className='w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-medium border-border hover:bg-accent'
					>
						<RefreshCw className='w-3.5 h-3.5' />
						Reload Page
					</Button>

					<Link href='/' className='w-full'>
						<Button
							type='button'
							variant='outline'
							className='w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-medium border-border hover:bg-accent'
						>
							<Home className='w-3.5 h-3.5' />
							Return Home
						</Button>
					</Link>

					<Link href='/browse' className='w-full'>
						<Button
							type='button'
							variant='outline'
							className='w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-medium border-border hover:bg-accent'
						>
							<ShoppingBag className='w-3.5 h-3.5' />
							Browse Catalog
						</Button>
					</Link>
				</motion.div>
			</div>
		</div>
	);
}
