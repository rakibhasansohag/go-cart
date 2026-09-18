import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/store/layout/header/header';
import Footer from '@/components/store/layout/footer/footer';
import {
	ShoppingBag,
	Store,
	ShieldCheck,
	Globe,
	ArrowRight,
	Zap,
	ChevronRight,
	Home,
	Users,
	Sparkles,
	Layers,
	Lock,
	Cpu,
} from 'lucide-react';

export const metadata: Metadata = {
	title: 'About Us | GoCart Multi-Vendor Marketplace',
	description:
		'Learn about GoCart, the next-generation multi-vendor e-commerce platform engineered for independent merchants and modern shoppers.',
};

export default function AboutPage() {
	return (
		<>
			<Header />
			<div className='min-h-screen bg-slate-50/60 dark:bg-background text-foreground'>
				{/* Breadcrumb Navigation Bar */}
				<div className='border-b border-border/60 bg-background/80 backdrop-blur-xs'>
					<div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs'>
						<nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-muted-foreground'>
							<Link href='/' className='inline-flex items-center gap-1 hover:text-foreground transition-colors'>
								<Home className='w-3.5 h-3.5' />
								<span>Home</span>
							</Link>
							<ChevronRight className='w-3.5 h-3.5 opacity-50' />
							<span className='font-medium text-foreground'>About Us</span>
						</nav>
						<Link
							href='/'
							className='inline-flex items-center gap-1 font-semibold text-primary hover:underline'
						>
							<span>← Back to Store</span>
						</Link>
					</div>
				</div>

				<main id='main-content' className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-16'>
					{/* Hero Section */}
					<header className='text-center space-y-4 max-w-3xl mx-auto'>
						<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold'>
							<ShoppingBag className='w-3.5 h-3.5' />
							<span>Next-Gen Commerce Infrastructure</span>
						</div>
						<h1 className='text-3xl sm:text-5xl font-extrabold tracking-tight'>
							Empowering Merchants, Delighting Shoppers
						</h1>
						<p className='text-base sm:text-lg text-muted-foreground leading-relaxed'>
							GoCart is an open, high-performance multi-vendor marketplace built for independent creators, boutique brands, and global shoppers.
						</p>
					</header>

					{/* Metrics Strip */}
					<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
						<div className='p-5 rounded-2xl bg-card border border-border/70 text-center shadow-xs space-y-1'>
							<div className='text-2xl sm:text-3xl font-extrabold text-foreground'>Multi-Tenant</div>
							<div className='text-xs text-muted-foreground'>Independent Stores & Catalogs</div>
						</div>
						<div className='p-5 rounded-2xl bg-card border border-border/70 text-center shadow-xs space-y-1'>
							<div className='text-2xl sm:text-3xl font-extrabold text-primary'>Real-Time</div>
							<div className='text-xs text-muted-foreground'>Stock & Parcel Tracking</div>
						</div>
						<div className='p-5 rounded-2xl bg-card border border-border/70 text-center shadow-xs space-y-1'>
							<div className='text-2xl sm:text-3xl font-extrabold text-foreground'>Stripe & PayPal</div>
							<div className='text-xs text-muted-foreground'>Direct Escrow & Payouts</div>
						</div>
						<div className='p-5 rounded-2xl bg-card border border-border/70 text-center shadow-xs space-y-1'>
							<div className='text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400'>100% Type-Safe</div>
							<div className='text-xs text-muted-foreground'>Next.js 16 & Prisma Core</div>
						</div>
					</div>

					{/* Platform Pillars */}
					<section className='space-y-6'>
						<div className='text-center space-y-2 max-w-xl mx-auto'>
							<h2 className='text-2xl sm:text-3xl font-bold tracking-tight'>Core Platform Pillars</h2>
							<p className='text-sm text-muted-foreground'>Engineered for trust, high throughput, and developer-grade reliability.</p>
						</div>

						<div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6'>
							<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3.5 transition-all hover:shadow-sm'>
								<div className='w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center'>
									<Store className='w-5 h-5' />
								</div>
								<h3 className='text-lg font-bold'>Multi-Tenant Vendor Hub</h3>
								<p className='text-sm text-muted-foreground leading-relaxed'>
									Merchants manage dedicated storefronts, customized discount vouchers, inventory matrices, and automated Stripe Connect payouts with complete tenant boundary isolation.
								</p>
							</div>

							<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3.5 transition-all hover:shadow-sm'>
								<div className='w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
									<ShieldCheck className='w-5 h-5' />
								</div>
								<h3 className='text-lg font-bold'>Buyer Protection & Escrow</h3>
								<p className='text-sm text-muted-foreground leading-relaxed'>
									Split-order fulfillment, encrypted checkout, and a multi-evidence dispute resolution pipeline protect every transaction with end-to-end transparency.
								</p>
							</div>

							<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3.5 transition-all hover:shadow-sm'>
								<div className='w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center'>
									<Zap className='w-5 h-5' />
								</div>
								<h3 className='text-lg font-bold'>Gamified Rewards & Coins</h3>
								<p className='text-sm text-muted-foreground leading-relaxed'>
									Daily check-in streaks, loyalty coin ledgers, and coupon exchange mechanics reward active shoppers and boost marketplace retention.
								</p>
							</div>

							<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3.5 transition-all hover:shadow-sm'>
								<div className='w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center'>
									<Layers className='w-5 h-5' />
								</div>
								<h3 className='text-lg font-bold'>Dynamic Storefronts</h3>
								<p className='text-sm text-muted-foreground leading-relaxed'>
									Admin-curated hero banners, flash sales, personalized recommendations, and instant search empower shoppers to discover deals in milliseconds.
								</p>
							</div>

							<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3.5 transition-all hover:shadow-sm'>
								<div className='w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center'>
									<Lock className='w-5 h-5' />
								</div>
								<h3 className='text-lg font-bold'>Enterprise Security</h3>
								<p className='text-sm text-muted-foreground leading-relaxed'>
									Built with strict Clerk authentication, SSRF prevention, Cloudinary media scanning, and automated rate-limiting to protect users and merchants alike.
								</p>
							</div>

							<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3.5 transition-all hover:shadow-sm'>
								<div className='w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center'>
									<Cpu className='w-5 h-5' />
								</div>
								<h3 className='text-lg font-bold'>Observability & Telemetry</h3>
								<p className='text-sm text-muted-foreground leading-relaxed'>
									Real-time administrative triage consoles, feedback sentiment analytics, and telemetry capture ensure constant platform refinement.
								</p>
							</div>
						</div>
					</section>

					{/* Tech & Creator Info */}
					<div className='p-8 sm:p-10 rounded-3xl border border-border/80 bg-card shadow-xs space-y-6'>
						<div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
							<div className='space-y-3 max-w-xl'>
								<div className='inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-muted text-foreground text-xs font-semibold'>
									<Sparkles className='w-3.5 h-3.5 text-primary' />
									<span>Engineering Lead & Architecture</span>
								</div>
								<h2 className='text-2xl sm:text-3xl font-bold'>Engineered by Rakib Hasan Sohag</h2>
								<p className='text-sm text-muted-foreground leading-relaxed'>
									Architected with Next.js 16 (App Router), React 19, PostgreSQL, Prisma ORM, TanStack Query, Clerk Auth, and Stripe Connect. Engineered for scale, real-time inventory synchronization, and type-safe data pipelines.
								</p>
							</div>
							<div className='flex flex-wrap md:flex-col gap-3 shrink-0'>
								<a
									href='https://github.com/rakibhasansohag'
									target='_blank'
									rel='noopener noreferrer'
									className='inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity'
								>
									GitHub Profile
								</a>
								<a
									href='https://rakib-hasan-sohag.vercel.app'
									target='_blank'
									rel='noopener noreferrer'
									className='inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold rounded-xl border border-border bg-background hover:bg-muted transition-colors text-foreground'
								>
									Portfolio Website
								</a>
								<a
									href='https://wa.me/8801760169982?text=Hello%20Rakib%2C%20contacting%20you%20regarding%20GoCart'
									target='_blank'
									rel='noopener noreferrer'
									className='inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors'
								>
									WhatsApp Direct
								</a>
							</div>
						</div>
					</div>

					{/* Quick CTA */}
					<div className='text-center space-y-4 py-8 border-t border-border/60'>
						<h3 className='text-xl sm:text-2xl font-bold'>Ready to explore GoCart?</h3>
						<p className='text-sm text-muted-foreground max-w-md mx-auto'>
							Discover featured products across global categories or apply to launch your own store.
						</p>
						<div className='flex flex-wrap justify-center gap-4 pt-2'>
							<Link
								href='/browse'
								className='inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-colors shadow-xs'
							>
								<span>Browse Catalog</span>
								<ArrowRight className='w-4 h-4' />
							</Link>
							<Link
								href='/seller/apply'
								className='inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-border bg-card hover:bg-muted font-semibold text-sm transition-colors text-foreground'
							>
								<span>Become a Seller</span>
							</Link>
						</div>
					</div>
				</main>
			</div>
			<Footer />
		</>
	);
}
