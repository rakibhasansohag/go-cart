import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/store/layout/header/header';
import Footer from '@/components/store/layout/footer/footer';
import {
	ShoppingBag,
	Store,
	ShieldCheck,
	Truck,
	CreditCard,
	ChevronRight,
	Home,
	Users,
	Sparkles,
	HeartHandshake,
	Github,
	Linkedin,
	ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
	title: 'About Us | GoCart Multi-Vendor Marketplace',
	description:
		'Learn about GoCart, our mission to champion independent sellers, and how our multi-vendor marketplace delivers a unified shopping experience.',
};

export default function AboutPage() {
	return (
		<>
			<Header />
			<div className='min-h-screen bg-background text-foreground'>
				{/* Breadcrumb Navigation Bar */}
				<div className='border-b border-border bg-card/60 backdrop-blur-xs'>
					<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs'>
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
							className='inline-flex items-center gap-1 font-semibold text-orange-500 hover:underline'
						>
							<span>← Back to Store</span>
						</Link>
					</div>
				</div>

				<main id='main-content' className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-16'>
					{/* Brand Story Hero */}
					<header className='text-center space-y-4 max-w-3xl mx-auto'>
						<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold'>
							<ShoppingBag className='w-3.5 h-3.5' />
							<span>The GoCart Marketplace Story</span>
						</div>
						<h1 className='text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground'>
							Empowering Independent Merchants, Delighting Shoppers
						</h1>
						<p className='text-sm sm:text-base text-muted-foreground leading-relaxed'>
							GoCart is a modern multi-vendor commerce destination designed to bridge independent brands, creative artisans, and local merchants directly with shoppers worldwide through a single unified shopping cart.
						</p>
					</header>

					{/* Our Mission & Vision Grid */}
					<section className='grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch'>
						<div className='rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3 shadow-xs'>
							<div className='w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center'>
								<Store className='w-5 h-5' />
							</div>
							<h2 className='text-xl font-bold text-foreground tracking-tight'>Our Core Mission</h2>
							<p className='text-sm text-muted-foreground leading-relaxed'>
								Independent store owners face high barriers when selling online — from hefty platform fees to complicated fulfillment logistics. GoCart provides each seller with a full digital storefront, dedicated inventory tracking, and direct payouts, enabling entrepreneurs to thrive on their own terms.
							</p>
						</div>

						<div className='rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-3 shadow-xs'>
							<div className='w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center'>
								<ShieldCheck className='w-5 h-5' />
							</div>
							<h2 className='text-xl font-bold text-foreground tracking-tight'>Our Shopper Promise</h2>
							<p className='text-sm text-muted-foreground leading-relaxed'>
								Shoppers should never have to juggle multiple accounts or checkout processes to support different makers. We combine orders across all verified vendors into one seamless bag, protected by escrow safeguards that keep your payment safe until you receive your items.
							</p>
						</div>
					</section>

					{/* How GoCart Works */}
					<section className='space-y-8'>
						<div className='text-center space-y-2 max-w-xl mx-auto'>
							<h2 className='text-2xl sm:text-3xl font-bold text-foreground tracking-tight'>
								How Marketplace Shopping Works
							</h2>
							<p className='text-xs sm:text-sm text-muted-foreground'>
								From browsing unique merchant collections to doorstep parcel delivery in three clear steps.
							</p>
						</div>

						<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
							<div className='rounded-2xl border border-border bg-card p-6 space-y-3 shadow-xs relative'>
								<div className='text-xs font-mono font-bold text-orange-500 uppercase tracking-widest'>
									Step 01
								</div>
								<h3 className='text-base font-bold text-foreground'>Discover Curated Stores</h3>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Browse thousands of products categorized across verified independent sellers. Filter by rating, category, and vendor reputation.
								</p>
							</div>

							<div className='rounded-2xl border border-border bg-card p-6 space-y-3 shadow-xs relative'>
								<div className='text-xs font-mono font-bold text-orange-500 uppercase tracking-widest'>
									Step 02
								</div>
								<h3 className='text-base font-bold text-foreground'>Unified Cart &amp; Checkout</h3>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Add items from three different stores into one shopping bag. Pay once using Stripe, PayPal, or Cards with encrypted protection.
								</p>
							</div>

							<div className='rounded-2xl border border-border bg-card p-6 space-y-3 shadow-xs relative'>
								<div className='text-xs font-mono font-bold text-orange-500 uppercase tracking-widest'>
									Step 03
								</div>
								<h3 className='text-base font-bold text-foreground'>Split Delivery &amp; Tracking</h3>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Each seller receives their package order and dispatches it directly. Track every parcel independently right from your account.
								</p>
							</div>
						</div>
					</section>

					{/* Platform Values */}
					<section className='rounded-2xl border border-border bg-card p-6 sm:p-10 space-y-8 shadow-xs'>
						<div className='text-center space-y-2 max-w-xl mx-auto'>
							<h2 className='text-2xl font-bold text-foreground tracking-tight'>
								Built on Trust, Transparency &amp; Speed
							</h2>
							<p className='text-xs text-muted-foreground'>
								The principles guiding how we operate GoCart every day.
							</p>
						</div>

						<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'>
							<div className='space-y-2'>
								<div className='w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center'>
									<CreditCard className='w-4 h-4' />
								</div>
								<h4 className='text-sm font-bold text-foreground'>Transparent Pricing</h4>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									No surprise fees at checkout. Clear delivery rates and upfront discounts calculated automatically.
								</p>
							</div>

							<div className='space-y-2'>
								<div className='w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center'>
									<Truck className='w-4 h-4' />
								</div>
								<h4 className='text-sm font-bold text-foreground'>Live Parcel Tracking</h4>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Milestone tracking from dispatch to delivery for complete peace of mind.
								</p>
							</div>

							<div className='space-y-2'>
								<div className='w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center'>
									<HeartHandshake className='w-4 h-4' />
								</div>
								<h4 className='text-sm font-bold text-foreground'>Fair Seller Escrow</h4>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Sellers get paid promptly upon confirmed delivery, ensuring high merchant accountability.
								</p>
							</div>

							<div className='space-y-2'>
								<div className='w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center'>
									<Users className='w-4 h-4' />
								</div>
								<h4 className='text-sm font-bold text-foreground'>Dedicated Support</h4>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Human assistance for returns, disputes, and inquiries available via WhatsApp and email.
								</p>
							</div>
						</div>
					</section>

					{/* Platform Creator & Engineering Note */}
					<section className='rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs'>
						<div className='space-y-2 text-center md:text-left'>
							<div className='inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500'>
								<Sparkles className='w-3.5 h-3.5' />
								<span>Lead Engineering &amp; Platform Architecture</span>
							</div>
							<h3 className='text-lg font-bold text-foreground'>
								Crafted with Dedication by Rakib Hasan Sohag
							</h3>
							<p className='text-xs text-muted-foreground max-w-xl leading-relaxed'>
								GoCart is actively engineered with modern web technologies including Next.js, PostgreSQL, and Prisma ORM to provide an accessible, high-performance marketplace experience.
							</p>
						</div>

						<div className='flex items-center gap-3 shrink-0'>
							<a
								href='https://github.com/rakibhasansohag'
								target='_blank'
								rel='noopener noreferrer'
								className='flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition-all'
							>
								<Github className='w-4 h-4' />
								<span>GitHub</span>
							</a>
							<a
								href='https://linkedin.com/in/rakibhasansohag'
								target='_blank'
								rel='noopener noreferrer'
								className='flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted/30 hover:bg-muted text-xs font-semibold text-foreground transition-all'
							>
								<Linkedin className='w-4 h-4 text-blue-500' />
								<span>LinkedIn</span>
							</a>
						</div>
					</section>

					{/* Call to Action Bar */}
					<section className='text-center space-y-4 pt-4 border-t border-border'>
						<h2 className='text-xl sm:text-2xl font-bold text-foreground tracking-tight'>
							Ready to Experience GoCart?
						</h2>
						<div className='flex flex-wrap items-center justify-center gap-4'>
							<Link
								href='/'
								className='inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-600 to-orange-500 hover:opacity-90 text-white text-sm font-bold shadow-sm transition-all'
							>
								<span>Start Shopping</span>
								<ArrowRight className='w-4 h-4' />
							</Link>
							<Link
								href='/dashboard/seller'
								className='inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border bg-card hover:bg-muted/40 text-foreground text-sm font-semibold transition-all'
							>
								<Store className='w-4 h-4 text-orange-500' />
								<span>Become a Seller</span>
							</Link>
						</div>
					</section>
				</main>
			</div>
			<Footer />
		</>
	);
}
