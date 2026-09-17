'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Search, ArrowRight, Truck, CheckCircle2 } from 'lucide-react';

export default function TrackOrderPage() {
	const router = useRouter();
	const [orderId, setOrderId] = useState('');

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = orderId.trim();
		if (trimmed) {
			router.push(`/order/${trimmed}`);
		} else {
			router.push('/profile/orders');
		}
	};

	return (
		<div className='min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-2xl mx-auto space-y-10'>
				<header className='text-center space-y-3'>
					<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold'>
						<Truck className='w-3.5 h-3.5' />
						<span>Order Tracking</span>
					</div>
					<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight'>
						Track Your Package
					</h1>
					<p className='text-sm sm:text-base text-muted-foreground'>
						Enter your GoCart Order ID or review your recent order history.
					</p>
				</header>

				<div className='p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-lg space-y-6'>
					<form onSubmit={handleSubmit} className='space-y-4'>
						<div className='space-y-2'>
							<label htmlFor='orderId' className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
								Order ID / Tracking Number
							</label>
							<div className='relative'>
								<Package className='w-5 h-5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2' />
								<input
									id='orderId'
									type='text'
									value={orderId}
									onChange={(e) => setOrderId(e.target.value)}
									placeholder='e.g. ord_clrk12345...'
									className='w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm'
								/>
							</div>
						</div>

						<button
							type='submit'
							className='w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2'
						>
							<Search className='w-4 h-4' />
							<span>Track Order</span>
						</button>
					</form>

					<div className='relative flex items-center justify-center'>
						<div className='border-t border-border w-full' />
						<span className='bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider shrink-0'>
							Or
						</span>
					</div>

					<div className='text-center'>
						<Link
							href='/profile/orders'
							className='inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline'
						>
							<span>View all orders in your account profile</span>
							<ArrowRight className='w-4 h-4' />
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
