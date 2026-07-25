'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

export default function DashboardGlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error('Dashboard global error:', error);
	}, [error]);

	return (
		<div className='flex flex-col items-center justify-center min-h-[70vh] p-6 text-center rounded-2xl border border-border bg-card/60 backdrop-blur-xs space-y-5 my-6 max-w-2xl mx-auto'>
			<div className='w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-xs'>
				<AlertCircle className='w-8 h-8' />
			</div>

			<div className='space-y-2 max-w-md'>
				<h2 className='text-2xl font-bold tracking-tight text-foreground'>
					Dashboard Exception
				</h2>
				<p className='text-sm text-muted-foreground leading-relaxed'>
					{error?.message || 'An unexpected error occurred while processing your request.'}
				</p>
			</div>

			<div className='flex flex-wrap items-center justify-center gap-3 pt-2'>
				<Button
					onClick={() => reset()}
					variant='default'
					className='gap-2 rounded-xl h-10 px-5 text-xs font-semibold'
				>
					<RefreshCw className='w-3.5 h-3.5' />
					Reload Section
				</Button>

				<Link href='/dashboard/seller'>
					<Button
						variant='outline'
						className='gap-2 rounded-xl h-10 px-5 text-xs font-medium'
					>
						<LayoutDashboard className='w-3.5 h-3.5' />
						Go to Seller Dashboard
					</Button>
				</Link>
			</div>
		</div>
	);
}
