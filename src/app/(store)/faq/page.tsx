import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle, ArrowRight, ShoppingBag, Store, ShieldCheck, CreditCard } from 'lucide-react';

export const metadata: Metadata = {
	title: 'Frequently Asked Questions (FAQ) | GoCart',
	description:
		'Frequently asked questions regarding buyers, store sellers, payments, order tracking, and returns on GoCart.',
};

const FAQS = [
	{
		question: 'How does multi-vendor cart and checkout work?',
		answer:
			'You can add products from multiple different independent sellers into one shopping cart. At checkout, payment is captured in a single transaction, and GoCart automatically creates separate order packages for each seller to fulfill.',
		category: 'Buyer Shopping',
	},
	{
		question: 'How do I track my order parcels?',
		answer:
			'Visit your profile orders page or go to Track Your Order. You will see individual tracking numbers and fulfillment status for each vendor package in your order.',
		category: 'Orders & Shipping',
	},
	{
		question: 'How do daily check-in loyalty coins work?',
		answer:
			'Log in daily and check in on your profile rewards page. Maintaining a daily streak grants bonus coins and mystery boxes, which can be exchanged for marketplace discount coupons.',
		category: 'Loyalty Rewards',
	},
	{
		question: 'How do sellers receive payouts?',
		answer:
			'Sellers connect their Stripe Express accounts during onboarding. After order fulfillment and the standard escrow hold period, earnings minus the platform commission (2%) are automatically disbursed.',
		category: 'Seller & Payouts',
	},
	{
		question: 'What is the return and refund policy?',
		answer:
			'If an item arrives damaged or incorrect, submit a return request with photo evidence from your profile orders tab within the seller return window. Marketplace administrators arbitrate disputed claims.',
		category: 'Returns & Disputes',
	},
];

export default function FAQPage() {
	return (
		<div className='min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-4xl mx-auto space-y-12'>
				<header className='text-center space-y-3 max-w-2xl mx-auto'>
					<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold'>
						<HelpCircle className='w-3.5 h-3.5' />
						<span>Help Center</span>
					</div>
					<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight'>
						Frequently Asked Questions
					</h1>
					<p className='text-sm sm:text-base text-muted-foreground leading-relaxed'>
						Find quick answers to common questions about shopping, selling, payments, and account rewards on GoCart.
					</p>
				</header>

				{/* FAQ Accordions / Cards */}
				<div className='space-y-4'>
					{FAQS.map((faq, idx) => (
						<div
							key={idx}
							className='p-6 rounded-2xl border border-border bg-card space-y-2.5 transition-colors hover:border-emerald-500/40'
						>
							<div className='flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider'>
								<span>{faq.category}</span>
							</div>
							<h3 className='text-base sm:text-lg font-bold text-foreground'>
								{faq.question}
							</h3>
							<p className='text-sm text-muted-foreground leading-relaxed'>
								{faq.answer}
							</p>
						</div>
					))}
				</div>

				{/* Documentation Banner */}
				<div className='p-6 sm:p-8 rounded-3xl border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left'>
					<div className='space-y-1'>
						<h3 className='font-bold text-base text-foreground'>
							Looking for deep technical guides & API details?
						</h3>
						<p className='text-xs sm:text-sm text-muted-foreground'>
							Explore our interactive Documentation Center with guides for buyers, sellers, and administrators.
						</p>
					</div>
					<Link
						href='/documentation/introduction'
						className='inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shrink-0 transition-colors'
					>
						<span>Visit Docs Hub</span>
						<ArrowRight className='w-4 h-4' />
					</Link>
				</div>
			</div>
		</div>
	);
}
