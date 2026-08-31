'use client';

import { useEffect } from 'react';
import { logEvent } from '@/lib/observability/logger';

interface GlobalErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
	useEffect(() => {
		logEvent('error', 'global_layout_error', {
			name: error.name,
			message: error.message,
			digest: error.digest,
		});
	}, [error]);

	return (
		<html lang='en'>
			<body className='min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans antialiased'>
				<div className='max-w-md w-full text-center space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl'>
					<div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-2xl font-bold'>
						!
					</div>

					<div className='space-y-2'>
						<h1 className='text-2xl font-bold text-white tracking-tight'>
							Critical Application Error
						</h1>
						<p className='text-slate-400 text-sm leading-relaxed'>
							A critical system error occurred while rendering the page layout.
						</p>
						{error.digest && (
							<p className='text-xs font-mono text-slate-500'>
								Reference: {error.digest}
							</p>
						)}
					</div>

					<div className='flex flex-col sm:flex-row items-center justify-center gap-3 pt-2'>
						<button
							type='button'
							onClick={() => reset()}
							className='w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer'
						>
							Retry
						</button>
						<button
							type='button'
							onClick={() => {
								window.location.href = '/';
							}}
							className='w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer'
						>
							Return Home
						</button>
					</div>
				</div>
			</body>
		</html>
	);
}
