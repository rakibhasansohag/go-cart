'use client';

import React from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';

export default function FullScreenLoader() {
	return (
		<div
			aria-live='polite'
			role='status'
			className='fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm'
		>
			<Card className='w-full max-w-md mx-4 rounded-xl shadow-lg'>
				<CardContent className='flex flex-col items-center gap-4 py-8'>
					{/* spinner */}
					<div
						className='h-16 w-16 rounded-full border-4 border-gray-200 border-t-emerald-500 animate-spin'
						aria-hidden
					/>

					{/* Branding / animated text */}
					<div className='text-center'>
						<CardTitle className='text-lg'>Loading GoCart…</CardTitle>
						<p className='mt-1 text-sm text-muted-foreground'>
							Please wait — we&apos;re getting things ready.
						</p>
					</div>

					{/* three-dot subtle loader */}
					<div className='mt-2 flex items-center gap-2'>
						<span
							className='inline-block h-2 w-2 rounded-full bg-emerald-500 animate-bounce'
							style={{ animationDelay: '0s' }}
						/>
						<span
							className='inline-block h-2 w-2 rounded-full bg-emerald-500/80 animate-bounce'
							style={{ animationDelay: '0.12s' }}
						/>
						<span
							className='inline-block h-2 w-2 rounded-full bg-emerald-500/60 animate-bounce'
							style={{ animationDelay: '0.24s' }}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
