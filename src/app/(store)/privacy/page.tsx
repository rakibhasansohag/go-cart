import React from 'react';
import type { Metadata } from 'next';
import { ShieldCheck, Lock, Eye, Database } from 'lucide-react';

export const metadata: Metadata = {
	title: 'Privacy Policy | GoCart Multi-Vendor Marketplace',
	description:
		'Read the GoCart Privacy Policy to understand how we collect, protect, and process user, seller, and transaction data.',
};

export default function PrivacyPolicyPage() {
	return (
		<div className='min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-4xl mx-auto space-y-10'>
				<header className='space-y-3 border-b border-border pb-6'>
					<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold'>
						<ShieldCheck className='w-3.5 h-3.5' />
						<span>Legal & Compliance</span>
					</div>
					<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight'>
						Privacy Policy
					</h1>
					<p className='text-xs sm:text-sm text-muted-foreground'>
						Last Updated: September 2026
					</p>
				</header>

				<div className='space-y-8 text-sm sm:text-base leading-relaxed text-muted-foreground'>
					<section className='space-y-3'>
						<h2 className='text-xl font-bold text-foreground'>1. Information We Collect</h2>
						<p>
							GoCart collects information necessary to provide a secure multi-vendor marketplace experience:
						</p>
						<ul className='list-disc pl-5 space-y-1'>
							<li><strong>Account Data:</strong> Name, email address, and profile details provided via Clerk Authentication.</li>
							<li><strong>Order & Transaction Data:</strong> Shipping addresses, purchased items, and fulfillment history. Payment credentials are processed directly by Stripe Connect and PayPal.</li>
							<li><strong>Seller Business Data:</strong> Store names, logos, announcement texts, and payout details required for seller disbursement.</li>
						</ul>
					</section>

					<section className='space-y-3'>
						<h2 className='text-xl font-bold text-foreground'>2. How We Use Your Data</h2>
						<p>
							We process user information to authenticate sessions, coordinate multi-store parcel shipments, calculate loyalty coin check-in streaks, arbitrate dispute claims, and prevent marketplace fraud.
						</p>
					</section>

					<section className='space-y-3'>
						<h2 className='text-xl font-bold text-foreground'>3. Multi-Tenant Data Isolation</h2>
						<p>
							GoCart enforces database-level tenant boundary isolation. Competing store vendors cannot access, view, or export your personal browsing history, carts, or payment data.
						</p>
					</section>

					<section className='space-y-3'>
						<h2 className='text-xl font-bold text-foreground'>4. Data Retention & Security</h2>
						<p>
							All database communications use TLS encryption. In-memory and disk records are protected with row-level permission guards and rate limiting against automated scraping.
						</p>
					</section>

					<section className='space-y-3'>
						<h2 className='text-xl font-bold text-foreground'>5. Contacting Us Regarding Privacy</h2>
						<p>
							For data inquiries, access requests, or deletion requests, contact us at{' '}
							<a
								href='mailto:rakibhasansohag133@gmail.com'
								className='text-emerald-600 dark:text-emerald-400 font-medium hover:underline'
							>
								rakibhasansohag133@gmail.com
							</a>.
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}
