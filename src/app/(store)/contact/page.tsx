import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/store/layout/header/header';
import Footer from '@/components/store/layout/footer/footer';
import ContactForm from '@/components/store/contact/contact-form';
import {
	Phone,
	Mail,
	MapPin,
	MessageSquare,
	Clock,
	ChevronRight,
	Home,
	Package,
	RotateCcw,
	Store,
	HelpCircle,
	ArrowUpRight,
	ShieldCheck,
} from 'lucide-react';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';

export const metadata: Metadata = {
	title: 'Contact Us | GoCart Multi-Vendor Marketplace',
	description:
		'Reach out to GoCart customer support, connect with merchant relations, or contact lead platform developer Rakib Hasan Sohag.',
};

export default function ContactPage() {
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
							<span className='font-medium text-foreground'>Contact Us</span>
						</nav>
						<Link
							href='/'
							className='inline-flex items-center gap-1 font-semibold text-orange-500 hover:underline'
						>
							<span>← Back to Store</span>
						</Link>
					</div>
				</div>

				<main id='main-content' className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 space-y-12'>
					{/* Header Banner */}
					<header className='text-center space-y-3 max-w-2xl mx-auto'>
						<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-semibold'>
							<MessageSquare className='w-3.5 h-3.5' />
							<span>Customer Care & Operations</span>
						</div>
						<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground'>
							We Are Here to Help
						</h1>
						<p className='text-sm text-muted-foreground leading-relaxed'>
							Have questions regarding an order, vendor onboarding, payments, or platform issues? Our support desk and developer team are ready to assist.
						</p>
					</header>

					{/* 2-Column Layout: Contact Form + Direct Support Info */}
					<div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
						{/* Left: Contact Form (7 cols) */}
						<div className='lg:col-span-7'>
							<ContactForm />
						</div>

						{/* Right: Direct Channels & Hours (5 cols) */}
						<div className='lg:col-span-5 space-y-4'>
							{/* WhatsApp Channel */}
							<div className='rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-3'>
										<div className='w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0'>
											<MessageSquare className='w-5 h-5' />
										</div>
										<div>
											<h3 className='text-sm font-bold text-foreground'>WhatsApp Direct Assistance</h3>
											<p className='text-xs text-muted-foreground'>Fastest channel for live shopper assistance</p>
										</div>
									</div>
									<span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'>
										<span className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
										Live
									</span>
								</div>
								<a
									href='https://wa.me/8801760169982'
									target='_blank'
									rel='noopener noreferrer'
									className='flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/70 text-xs font-semibold text-foreground transition-all group'
								>
									<span>+880 1760-169982</span>
									<ArrowUpRight className='w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform' />
								</a>
							</div>

							{/* Support Email */}
							<div className='rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs'>
								<div className='flex items-center gap-3'>
									<div className='w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0'>
										<Mail className='w-5 h-5' />
									</div>
									<div>
										<h3 className='text-sm font-bold text-foreground'>Customer Support Desk</h3>
										<p className='text-xs text-muted-foreground'>Ticket tracking and formal correspondence</p>
									</div>
								</div>
								<div className='p-3 rounded-xl bg-muted/40 text-xs font-mono text-foreground space-y-1'>
									<div className='flex justify-between'>
										<span className='text-muted-foreground'>Primary:</span>
										<a href='mailto:rakibhasansohag133@gmail.com' className='hover:underline font-semibold'>
											rakibhasansohag133@gmail.com
										</a>
									</div>
									<div className='flex justify-between'>
										<span className='text-muted-foreground'>Resolution:</span>
										<span className='text-muted-foreground'>Within 2-4 business hours</span>
									</div>
								</div>
							</div>

							{/* Voice Helpline & Operating Schedule */}
							<div className='rounded-2xl border border-border bg-card p-5 space-y-3 shadow-xs'>
								<div className='flex items-center gap-3'>
									<div className='w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0'>
										<Clock className='w-5 h-5' />
									</div>
									<div>
										<h3 className='text-sm font-bold text-foreground'>Voice Line & Hours</h3>
										<p className='text-xs text-muted-foreground'>Urgent merchant and order inquiries</p>
									</div>
								</div>
								<div className='grid grid-cols-2 gap-2 text-xs'>
									<div className='p-3 rounded-xl bg-muted/40'>
										<span className='text-muted-foreground block text-[11px]'>Direct Hotline</span>
										<a href='tel:+8801760169982' className='font-bold text-foreground hover:underline'>
											+880 1760-169982
										</a>
									</div>
									<div className='p-3 rounded-xl bg-muted/40'>
										<span className='text-muted-foreground block text-[11px]'>Service Schedule</span>
										<span className='font-bold text-foreground'>Sat - Thu, 9am - 8pm</span>
									</div>
								</div>
							</div>

							{/* Headquarters */}
							<div className='rounded-2xl border border-border bg-card p-5 space-y-2 shadow-xs'>
								<div className='flex items-center gap-3'>
									<div className='w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0'>
										<MapPin className='w-5 h-5' />
									</div>
									<div>
										<h3 className='text-sm font-bold text-foreground'>Platform Headquarters</h3>
										<p className='text-xs text-muted-foreground'>Dhaka, Bangladesh (UTC+6)</p>
									</div>
								</div>
								<p className='text-xs text-muted-foreground pt-1'>
									Engineering studio led by developer <strong>Rakib Hasan Sohag</strong>.
								</p>
							</div>
						</div>
					</div>

					{/* Self-Service Portals Row */}
					<section className='space-y-4 pt-4 border-t border-border'>
						<div className='text-center space-y-1'>
							<h2 className='text-lg font-bold text-foreground tracking-tight'>
								Looking for Immediate Self-Service?
							</h2>
							<p className='text-xs text-muted-foreground'>
								Access automated tools directly without waiting for a support reply.
							</p>
						</div>

						<div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
							<Link
								href='/dashboard/user/orders'
								className='rounded-2xl border border-border bg-card hover:border-orange-500/50 p-5 transition-all group shadow-xs'
							>
								<div className='flex items-center gap-3 mb-2'>
									<div className='w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center'>
										<Package className='w-4 h-4' />
									</div>
									<span className='text-sm font-bold text-foreground group-hover:text-orange-500 transition-colors'>
										Track Order Status
									</span>
								</div>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Inspect live courier milestones, delivery notes, and split vendor parcels.
								</p>
							</Link>

							<Link
								href='/returns-disputes'
								className='rounded-2xl border border-border bg-card hover:border-orange-500/50 p-5 transition-all group shadow-xs'
							>
								<div className='flex items-center gap-3 mb-2'>
									<div className='w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center'>
										<RotateCcw className='w-4 h-4' />
									</div>
									<span className='text-sm font-bold text-foreground group-hover:text-orange-500 transition-colors'>
										Returns & Refunds
									</span>
								</div>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									File an item return, submit condition photos, or request platform arbitration.
								</p>
							</Link>

							<Link
								href='/dashboard/seller'
								className='rounded-2xl border border-border bg-card hover:border-orange-500/50 p-5 transition-all group shadow-xs'
							>
								<div className='flex items-center gap-3 mb-2'>
									<div className='w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center'>
										<Store className='w-4 h-4' />
									</div>
									<span className='text-sm font-bold text-foreground group-hover:text-orange-500 transition-colors'>
										Seller Hub & Onboarding
									</span>
								</div>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Apply to launch a storefront, manage product stock, and configure payouts.
								</p>
							</Link>
						</div>
					</section>

					{/* Frequently Asked Questions */}
					<section className='rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-xs'>
						<div className='flex items-center gap-3 pb-3 border-b border-border/60'>
							<div className='w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center'>
								<HelpCircle className='w-5 h-5' />
							</div>
							<div>
								<h2 className='text-lg font-bold text-foreground'>Frequently Asked Questions</h2>
								<p className='text-xs text-muted-foreground'>Quick answers to common marketplace questions</p>
							</div>
						</div>

						<Accordion type='single' collapsible className='w-full'>
							<AccordionItem value='faq-1'>
								<AccordionTrigger className='text-sm text-foreground hover:no-underline font-semibold'>
									How does checkout work when I buy from multiple stores?
								</AccordionTrigger>
								<AccordionContent className='text-xs text-muted-foreground leading-relaxed'>
									GoCart combines items from all vendors into one unified cart. You make a single payment at checkout, and our order pipeline automatically splits the order into separate merchant packages. Each store handles packaging and dispatch independently with dedicated courier tracking.
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value='faq-2'>
								<AccordionTrigger className='text-sm text-foreground hover:no-underline font-semibold'>
									How does buyer escrow protection work on GoCart?
								</AccordionTrigger>
								<AccordionContent className='text-xs text-muted-foreground leading-relaxed'>
									When you pay for an order, the vendor payout is held safely in escrow until the package tracking confirms successful doorstep delivery. In case of damaged or missing items, you can open a dispute directly from your account.
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value='faq-3'>
								<AccordionTrigger className='text-sm text-foreground hover:no-underline font-semibold'>
									What payment options are available?
								</AccordionTrigger>
								<AccordionContent className='text-xs text-muted-foreground leading-relaxed'>
									GoCart supports credit/debit cards (Visa, Mastercard, American Express) powered by Stripe, PayPal account payments, and cash on delivery (where supported by individual merchants).
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value='faq-4'>
								<AccordionTrigger className='text-sm text-foreground hover:no-underline font-semibold'>
									How can I apply to become an independent seller?
								</AccordionTrigger>
								<AccordionContent className='text-xs text-muted-foreground leading-relaxed'>
									Visit the Seller Hub through the navigation menu or click &quot;Seller Hub &amp; Onboarding&quot; above. Complete your merchant profile, connect your payout account, and our compliance team will review your application within 24 hours.
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</section>
				</main>
			</div>
			<Footer />
		</>
	);
}
