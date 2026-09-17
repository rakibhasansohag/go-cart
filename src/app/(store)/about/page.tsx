import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingBag, Store, ShieldCheck, Globe, ArrowRight, Zap } from 'lucide-react';

export const metadata: Metadata = {
	title: 'About Us | GoCart Multi-Vendor Marketplace',
	description:
		'Learn about GoCart, the next-generation multi-vendor e-commerce platform engineered for independent merchants and modern shoppers.',
};

export default function AboutPage() {
	return (
		<div className='min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-5xl mx-auto space-y-16'>
				{/* Hero Section */}
				<header className='text-center space-y-4 max-w-3xl mx-auto'>
					<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold'>
						<ShoppingBag className='w-3.5 h-3.5' />
						<span>About GoCart</span>
					</div>
					<h1 className='text-3xl sm:text-5xl font-extrabold tracking-tight'>
						Empowering Merchants, Delighting Shoppers
					</h1>
					<p className='text-base sm:text-lg text-muted-foreground leading-relaxed'>
						GoCart is a multi-vendor e-commerce ecosystem connecting independent creators, boutique stores, and major brands with shoppers worldwide.
					</p>
				</header>

				{/* Platform Pillars */}
				<div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6'>
					<div className='p-6 rounded-2xl border border-border bg-card space-y-3'>
						<div className='w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
							<Store className='w-5 h-5' />
						</div>
						<h3 className='text-lg font-bold'>Multi-Tenant Vendor Hub</h3>
						<p className='text-sm text-muted-foreground leading-relaxed'>
							Merchants enjoy dedicated storefront branding, custom policy matrices, inventory control, and automated Stripe Connect payouts.
						</p>
					</div>

					<div className='p-6 rounded-2xl border border-border bg-card space-y-3'>
						<div className='w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
							<ShieldCheck className='w-5 h-5' />
						</div>
						<h3 className='text-lg font-bold'>Buyer Protection & Escrow</h3>
						<p className='text-sm text-muted-foreground leading-relaxed'>
							Split-order fulfillment, encrypted checkout, and a multi-evidence dispute resolution pipeline protect every transaction.
						</p>
					</div>

					<div className='p-6 rounded-2xl border border-border bg-card space-y-3'>
						<div className='w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
							<Zap className='w-5 h-5' />
						</div>
						<h3 className='text-lg font-bold'>Gamified Rewards</h3>
						<p className='text-sm text-muted-foreground leading-relaxed'>
							Daily check-in streaks, loyalty coin ledgers, and coupon exchange mechanics reward consistent shopper engagement.
						</p>
					</div>
				</div>

				{/* Tech & Creator Info */}
				<div className='p-8 rounded-3xl border border-border bg-muted/20 space-y-6'>
					<div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
						<div className='space-y-2 max-w-xl'>
							<h2 className='text-2xl font-bold'>Engineered by Rakib Hasan Sohag</h2>
							<p className='text-sm text-muted-foreground leading-relaxed'>
								Built with Next.js 16, PostgreSQL, Prisma ORM, TanStack Query, Clerk Auth, and Stripe Connect. Designed for scale, real-time inventory synchronization, and type-safe architecture.
							</p>
						</div>
						<div className='flex flex-wrap gap-3'>
							<a
								href='https://github.com/rakibhasansohag'
								target='_blank'
								rel='noopener noreferrer'
								className='px-4 py-2 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity'
							>
								GitHub Profile
							</a>
							<a
								href='https://rakib-hasan-sohag.vercel.app'
								target='_blank'
								rel='noopener noreferrer'
								className='px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted transition-colors'
							>
								Portfolio Website
							</a>
							<a
								href='https://wa.me/8801760169982?text=Hello%20Rakib%2C%20contacting%20you%20regarding%20GoCart'
								target='_blank'
								rel='noopener noreferrer'
								className='px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors'
							>
								WhatsApp (+8801760169982)
							</a>
						</div>
					</div>
				</div>

				{/* Quick CTA */}
				<div className='text-center space-y-4 py-6 border-t border-border'>
					<h3 className='text-xl font-bold'>Ready to explore the marketplace?</h3>
					<div className='flex justify-center gap-4'>
						<Link
							href='/browse'
							className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors'
						>
							<span>Browse Catalog</span>
							<ArrowRight className='w-4 h-4' />
						</Link>
						<Link
							href='/documentation/introduction'
							className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-muted font-medium text-sm transition-colors'
						>
							<span>Read Documentation</span>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
