'use client';
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalLink, Home, List, PlusCircle } from 'lucide-react';

type Suggestion = {
	title: string;
	description?: string;
	href: string;
	icon?: React.ReactNode;
};

export default function Animated404({
	title = 'Page not found',
	subtitle = "We couldn't find that page.",
	suggestions = [] as Suggestion[],
}: {
	title?: string;
	subtitle?: string;
	suggestions?: Suggestion[];
}) {
	return (
		<div className='min-h-[70vh] flex items-center justify-center px-4 py-10'>
			<div className='w-full max-w-5xl grid gap-8 lg:grid-cols-2 items-center'>
				<motion.div
					initial={{ opacity: 0, y: 18 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, ease: 'easeOut' }}
					className='flex flex-col gap-6'
				>
					<div className='flex items-center gap-3'>
						<h1 className='text-4xl md:text-5xl font-extrabold tracking-tight'>
							{title}
						</h1>
						<span className='inline-flex items-center px-2 py-1 rounded-md text-xs bg-f5 text-muted-foreground'>
							404
						</span>
					</div>

					<p className='text-muted-foreground max-w-xl'>{subtitle}</p>

					<div className='flex flex-wrap gap-3'>
						<Link href='/'>
							<Button variant='ghost' className='gap-2'>
								<Home className='w-4 h-4' />
								Go to homepage
							</Button>
						</Link>

						<Link href='/dashboard'>
							<Button className='gap-2'>
								<List className='w-4 h-4' />
								Dashboard
							</Button>
						</Link>

						<a href='mailto:rakibhasansohag133@gmail.com'>
							<Button variant='outline' className='gap-2'>
								<ExternalLink className='w-4 h-4' />
								Contact support
							</Button>
						</a>
					</div>

					<div className='space-y-3'>
						<h4 className='text-sm font-semibold'>Try these</h4>
						<div className='grid gap-3 sm:grid-cols-2'>
							{suggestions.map((s, i) => (
								<Card key={i} className='p-3'>
									<div className='flex items-start gap-3'>
										<div className='shrink-0 mt-1'>
											{s.icon ?? <PlusCircle className='w-5 h-5' />}
										</div>
										<div className='min-w-0'>
											<a
												href={s.href}
												className='text-sm font-semibold block hover:underline'
											>
												{s.title}
											</a>
											{s.description && (
												<p className='text-xs text-muted-foreground'>
													{s.description}
												</p>
											)}
										</div>
									</div>
								</Card>
							))}
						</div>
					</div>
				</motion.div>

				<motion.div
					initial={{ scale: 0.96, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ duration: 0.5, ease: 'easeOut' }}
					className='mx-auto'
				>
					<div className='relative w-full max-w-lg'>
						<svg
							viewBox='0 0 600 420'
							className='w-full'
							preserveAspectRatio='xMidYMid meet'
						>
							<defs>
								<linearGradient id='g1' x1='0' x2='1'>
									<stop offset='0%' stopColor='#FA6338' stopOpacity='0.95' />
									<stop offset='100%' stopColor='#FF8A50' stopOpacity='0.85' />
								</linearGradient>
								<filter id='f1' x='-20%' y='-20%' width='140%' height='140%'>
									<feGaussianBlur in='SourceGraphic' stdDeviation='12' />
								</filter>
							</defs>

							<motion.circle
								cx='180'
								cy='160'
								r='110'
								fill='url(#g1)'
								filter='url(#f1)'
								initial={{ x: -10 }}
								animate={{ x: 8 }}
								transition={{
									repeat: Infinity,
									repeatType: 'reverse',
									duration: 6,
								}}
							/>

							<motion.g
								initial={{ rotate: -6, x: 0 }}
								animate={{ rotate: 6, x: 6 }}
								transition={{
									repeat: Infinity,
									repeatType: 'reverse',
									duration: 4,
								}}
							>
								<rect
									x='240'
									y='60'
									rx='18'
									width='240'
									height='220'
									fill='#fff'
									opacity='0.9'
								/>
								<motion.text
									x='360'
									y='170'
									textAnchor='middle'
									style={{ fontSize: 64, fontWeight: 700 }}
									fill='#0b1220'
									initial={{ y: -6 }}
									animate={{ y: 6 }}
									transition={{
										repeat: Infinity,
										repeatType: 'reverse',
										duration: 3,
									}}
								>
									404
								</motion.text>
							</motion.g>

							<motion.path
								d='M80 320 C 160 280, 240 360, 320 320'
								stroke='#0D6EFD'
								strokeWidth='6'
								fill='none'
								strokeLinecap='round'
								initial={{ pathLength: 0 }}
								animate={{ pathLength: 1 }}
								transition={{ duration: 1.6 }}
							/>
						</svg>

						<div className='mt-6 text-center'>
							<p className='text-sm text-muted-foreground'>
								Looks like this route isn’t available.
							</p>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
