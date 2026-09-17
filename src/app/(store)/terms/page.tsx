import React from 'react';
import type { Metadata } from 'next';
import { FileText, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
	title: 'Terms of Service | GoCart Multi-Vendor Marketplace',
	description:
		'Terms of service and marketplace agreement for buyers and sellers operating on the GoCart multi-vendor e-commerce platform.',
};

export default function TermsOfServicePage() {
	return (
		<div className='min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-4xl mx-auto space-y-10'>
				<header className='space-y-3 border-b border-border pb-6'>
					<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold'>
						<FileText className='w-3.5 h-3.5' />
						<span>Marketplace Agreement</span>
					</div>
					<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight'>
						Terms of Service
					</h1>
					<p className='text-xs sm:text-sm text-muted-foreground'>
						Effective Date: September 2026
					</p>
				</header>

				<div className='space-y-8 text-sm sm:text-base leading-relaxed text-muted-foreground'>
					<section className='space-y-3'>
						<h2 className='text-xl font-bold text-foreground'>1. Acceptance of Terms</h2>
						<p>
							By accessing or using GoCart, you agree to comply with and be bound by these Terms of Service. If you are registering as a store vendor, you also agree to the Vendor Merchant Terms.
						</p>
					</section>

					<section className='space-y-3'>
						<h2 className='text-xl font-bold text-foreground'>2. Multi-Vendor Marketplace Structure</h2>
						<p>
							GoCart operates as a multi-vendor marketplace platform. Independent sellers list, price, and fulfill products. When a buyer checks out with products from multiple stores, orders are split into distinct store packages fulfilled independently by each seller.
						</p>
					</section>

					<section className='space-y-3'>
						<h2 className='text-xl font-bold text-foreground'>3. Platform Commission & Fees</h2>
						<p>
							GoCart assesses a platform commission (standard 2%) on completed merchant sales to maintain marketplace infrastructure, hosting, and payment gateways. Commissions are deducted automatically at order settlement.
						</p>
					</section>

					<section className='space-y-3'>
						<h2 className='text-xl font-bold text-foreground'>4. Returns & Dispute Arbitration</h2>
						<p>
							Buyers may initiate return requests within the store policy window by providing photo evidence and a dispute reason. If a merchant and buyer cannot resolve an issue, GoCart platform administrators arbitrate final refunds.
						</p>
					</section>

					<section className='space-y-3'>
						<h2 className='text-xl font-bold text-foreground'>5. Prohibited Activities</h2>
						<p>
							Users and merchants may not list counterfeit merchandise, abuse promo codes or loyalty coin mechanics, engage in rate-limit evasion, or attempt unauthorized cross-store data access.
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}
