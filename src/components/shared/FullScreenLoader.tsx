'use client';

import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function FullScreenLoader() {
	return (
		<div
			aria-live='polite'
			role='status'
			className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/45 backdrop-blur-xl'
		>
			<style
				dangerouslySetInnerHTML={{
					__html: `
					@keyframes shimmer {
						0% { transform: translateX(-100%); }
						100% { transform: translateX(200%); }
					}
					@keyframes pulse-glow {
						0%, 100% { opacity: 0.65; transform: scale(0.95); }
						50% { opacity: 1; transform: scale(1.05); }
					}
				`,
				}}
			/>

			<div className='flex flex-col items-center justify-center text-center p-6 select-none'>
				<div className='relative flex items-center justify-center h-20 w-20'>
					{/* Pulsing background glow */}
					<div className='absolute inset-0 rounded-full bg-emerald-500/10 blur-xl animate-pulse' />

					{/* Animated gradient spinning ring */}
					<svg className='w-full h-full animate-spin' viewBox='0 0 100 100'>
						<defs>
							<linearGradient id='loader-grad' x1='0%' y1='0%' x2='100%' y2='100%'>
								<stop offset='0%' stopColor='#10b981' stopOpacity='1' />
								<stop offset='50%' stopColor='#0d9488' stopOpacity='0.5' />
								<stop offset='100%' stopColor='transparent' stopOpacity='0' />
							</linearGradient>
						</defs>
						<circle
							cx='50'
							cy='50'
							r='40'
							stroke='url(#loader-grad)'
							strokeWidth='5'
							fill='transparent'
							strokeDasharray='180 70'
							strokeLinecap='round'
						/>
					</svg>

					{/* Pulsing logo icon inside */}
					<div
						className='absolute flex items-center justify-center text-emerald-500'
						style={{ animation: 'pulse-glow 2s infinite ease-in-out' }}
					>
						<ShoppingCart className='h-7 w-7 stroke-[1.8]' />
					</div>
				</div>

				{/* Brand Header */}
				<h1 className='mt-6 text-2xl font-extrabold font-mono tracking-wider bg-gradient-to-r from-foreground via-emerald-500 to-teal-500 bg-clip-text text-transparent'>
					GoCart
				</h1>

				{/* Loading indicator */}
				<p className='mt-2 text-xs font-semibold text-muted-foreground/75 uppercase tracking-[0.2em] animate-pulse'>
					Preparing your shopping experience...
				</p>

				{/* Progress Line */}
				<div className='relative mt-5 w-40 h-[2px] bg-muted/40 rounded-full overflow-hidden'>
					<div
						className='absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full'
						style={{
							animation: 'shimmer 1.5s infinite ease-in-out',
						}}
					/>
				</div>
			</div>
		</div>
	);
}

