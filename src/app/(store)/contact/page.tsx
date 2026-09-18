import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/store/layout/header/header';
import Footer from '@/components/store/layout/footer/footer';
import {
	Phone,
	Mail,
	MapPin,
	MessageSquare,
	Clock,
	Globe,
	ArrowRight,
	ShieldCheck,
	ChevronRight,
	Home,
	Package,
	RotateCcw,
	Store,
	HelpCircle,
} from 'lucide-react';

export const metadata: Metadata = {
	title: 'Contact Us | GoCart Multi-Vendor Marketplace',
	description:
		'Get in touch with the GoCart team, reach platform customer support, or connect with developer Rakib Hasan Sohag.',
};

export default function ContactPage() {
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
							<span className='font-medium text-foreground'>Contact Us</span>
						</nav>
						<Link
							href='/'
							className='inline-flex items-center gap-1 font-semibold text-primary hover:underline'
						>
							<span>← Back to Store</span>
						</Link>
					</div>
				</div>

				<main id='main-content' className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-12'>
					{/* Header */}
					<header className='text-center space-y-3 max-w-2xl mx-auto'>
						<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold'>
							<MessageSquare className='w-3.5 h-3.5' />
							<span>24/7 Dedicated Assistance</span>
						</div>
						<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight'>
							Get in Touch with GoCart
						</h1>
						<p className='text-sm sm:text-base text-muted-foreground leading-relaxed'>
							Have questions about store onboarding, orders, dispute resolution, or engineering integrations? Our team is ready to help.
						</p>
					</header>

					{/* Contact Channels Grid */}
					<div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
						{/* WhatsApp Instant */}
						<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3 flex flex-col justify-between transition-all hover:shadow-sm'>
							<div className='space-y-3'>
								<div className='w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
									<Globe className='w-5 h-5' />
								</div>
								<h3 className='font-bold text-base text-foreground'>WhatsApp Direct</h3>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Fastest response for quick questions, seller partnerships, and feedback:
								</p>
							</div>
							<a
								href='https://wa.me/8801760169982?text=Hello%20Rakib%2C%20contacting%20you%20regarding%20GoCart'
								target='_blank'
								rel='noopener noreferrer'
								className='inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline pt-2'
							>
								<span>Chat on WhatsApp</span>
								<ArrowRight className='w-3.5 h-3.5' />
							</a>
						</div>

						{/* Direct Email */}
						<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3 flex flex-col justify-between transition-all hover:shadow-sm'>
							<div className='space-y-3'>
								<div className='w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center'>
									<Mail className='w-5 h-5' />
								</div>
								<h3 className='font-bold text-base text-foreground'>Support Email</h3>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									For business inquiries, account verification, and official correspondence:
								</p>
							</div>
							<a
								href='mailto:rakibhasansohag133@gmail.com'
								className='text-xs font-semibold text-primary hover:underline truncate block pt-2'
							>
								rakibhasansohag133@gmail.com
							</a>
						</div>

						{/* Direct Phone */}
						<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3 flex flex-col justify-between transition-all hover:shadow-sm'>
							<div className='space-y-3'>
								<div className='w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center'>
									<Phone className='w-5 h-5' />
								</div>
								<h3 className='font-bold text-base text-foreground'>Voice Support</h3>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Direct phone line for urgent operational and technical inquiries:
								</p>
							</div>
							<a
								href='tel:+8801760169982'
								className='text-xs font-semibold text-foreground hover:underline font-mono pt-2 block'
							>
								+880 1760-169982
							</a>
						</div>

						{/* Location */}
						<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3 flex flex-col justify-between transition-all hover:shadow-sm'>
							<div className='space-y-3'>
								<div className='w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center'>
									<MapPin className='w-5 h-5' />
								</div>
								<h3 className='font-bold text-base text-foreground'>Engineering Base</h3>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Platform headquarters and lead development studio:
								</p>
							</div>
							<p className='text-xs font-semibold text-foreground pt-2'>
								Dhaka, Bangladesh (UTC+6)
							</p>
						</div>
					</div>

					{/* Quick Self-Service Pathways */}
					<div className='space-y-4'>
						<div className='text-center space-y-1.5 max-w-xl mx-auto'>
							<h2 className='text-xl sm:text-2xl font-bold'>Looking for Faster Answers?</h2>
							<p className='text-xs sm:text-sm text-muted-foreground'>
								Access automated self-service portals directly from your account.
							</p>
						</div>

						<div className='grid sm:grid-cols-2 md:grid-cols-4 gap-4'>
							<Link
								href='/track-order'
								className='p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/50 transition-colors space-y-2 block group'
							>
								<div className='w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center'>
									<Package className='w-4 h-4' />
								</div>
								<h4 className='font-bold text-sm group-hover:text-primary transition-colors'>
									Track Order Status
								</h4>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Enter your order ID to inspect live courier progress.
								</p>
							</Link>

							<Link
								href='/profile/returns'
								className='p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/50 transition-colors space-y-2 block group'
							>
								<div className='w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
									<RotateCcw className='w-4 h-4' />
								</div>
								<h4 className='font-bold text-sm group-hover:text-primary transition-colors'>
									Returns & Refunds
								</h4>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									File return requests, submit photos, and arbitrate claims.
								</p>
							</Link>

							<Link
								href='/seller/apply'
								className='p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/50 transition-colors space-y-2 block group'
							>
								<div className='w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center'>
									<Store className='w-4 h-4' />
								</div>
								<h4 className='font-bold text-sm group-hover:text-primary transition-colors'>
									Seller Onboarding
								</h4>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Apply to launch a store and disburse via Stripe Connect.
								</p>
							</Link>

							<Link
								href='/feedback'
								className='p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/50 transition-colors space-y-2 block group'
							>
								<div className='w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center'>
									<HelpCircle className='w-4 h-4' />
								</div>
								<h4 className='font-bold text-sm group-hover:text-primary transition-colors'>
									Submit Feedback
								</h4>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Suggest features or report glitches directly to engineering.
								</p>
							</Link>
						</div>
					</div>

					{/* Support Hours & SLA */}
					<div className='grid md:grid-cols-2 gap-6 p-6 sm:p-8 rounded-3xl border border-border/80 bg-card shadow-xs'>
						<div className='space-y-3'>
							<div className='flex items-center gap-2 font-bold text-foreground'>
								<Clock className='w-4 h-4 text-primary' />
								<span>Response SLA & Operating Schedule</span>
							</div>
							<p className='text-xs sm:text-sm text-muted-foreground leading-relaxed'>
								Our operational team monitors tickets 7 days a week. WhatsApp queries typically receive a response within 1 hour, while standard email tickets are resolved in under 12 hours.
							</p>
						</div>

						<div className='space-y-3'>
							<div className='flex items-center gap-2 font-bold text-foreground'>
								<ShieldCheck className='w-4 h-4 text-emerald-500' />
								<span>Order Security & Escrow Guarantee</span>
							</div>
							<p className='text-xs sm:text-sm text-muted-foreground leading-relaxed'>
								Payment amounts remain held safely in escrow until the order is successfully delivered by the merchant and confirmed by you, ensuring 100% buyer protection.
							</p>
						</div>
					</div>
				</main>
			</div>
			<Footer />
		</>
	);
}
