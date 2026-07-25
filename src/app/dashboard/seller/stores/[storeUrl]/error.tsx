'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Store } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function SellerStoreError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const params = useParams();
	const storeUrl = params?.storeUrl as string;

	useEffect(() => {
		console.error('Seller store section error:', error);
	}, [error]);

	return (
		<div className='flex flex-col items-center justify-center min-h-[60vh] p-6 text-center rounded-2xl border border-border bg-card/50 backdrop-blur-xs space-y-5 my-4'>
			<div className='w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shadow-xs'>
				<AlertTriangle className='w-7 h-7' />
			</div>

			<div className='space-y-2 max-w-md'>
				<h2 className='text-xl font-bold tracking-tight text-foreground'>
					Dashboard Error
				</h2>
				<p className='text-sm text-muted-foreground leading-relaxed'>
					{error?.message || 'Failed to load this store section. Please try again or return to the overview.'}
				</p>
			</div>

			<div className='flex flex-wrap items-center justify-center gap-3 pt-2'>
				<Button
					onClick={() => reset()}
					variant='default'
					className='gap-2 rounded-xl h-10 px-4 text-xs font-semibold'
				>
					<RefreshCw className='w-3.5 h-3.5' />
					Try Again
				</Button>

				{storeUrl && (
					<Link href={`/dashboard/seller/stores/${storeUrl}`}>
						<Button
							variant='outline'
							className='gap-2 rounded-xl h-10 px-4 text-xs font-medium'
						>
							<Store className='w-3.5 h-3.5' />
							Store Overview
						</Button>
					</Link>
				)}
			</div>
		</div>
	);
}
