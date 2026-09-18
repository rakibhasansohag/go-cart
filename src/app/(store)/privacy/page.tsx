import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/store/layout/header/header';
import Footer from '@/components/store/layout/footer/footer';
import {
	ShieldCheck,
	Lock,
	Eye,
	Database,
	ChevronRight,
	Home,
	UserCheck,
	FileText,
	KeyRound,
} from 'lucide-react';

export const metadata: Metadata = {
	title: 'Privacy Policy | GoCart Multi-Vendor Marketplace',
	description:
		'Read the GoCart Privacy Policy to understand how we collect, protect, and process user, seller, and transaction data.',
};

export default function PrivacyPolicyPage() {
	return (
		<>
			<Header />
			<div className='min-h-screen bg-slate-50/60 dark:bg-background text-foreground'>
				{/* Breadcrumb Navigation Bar */}
				<div className='border-b border-border/60 bg-background/80 backdrop-blur-xs'>
					<div className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs'>
						<nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-muted-foreground'>
							<Link href='/' className='inline-flex items-center gap-1 hover:text-foreground transition-colors'>
								<Home className='w-3.5 h-3.5' />
								<span>Home</span>
							</Link>
							<ChevronRight className='w-3.5 h-3.5 opacity-50' />
							<span className='font-medium text-foreground'>Privacy Policy</span>
						</nav>
						<Link
							href='/'
							className='inline-flex items-center gap-1 font-semibold text-primary hover:underline'
						>
							<span>← Back to Store</span>
						</Link>
					</div>
				</div>

				<main id='main-content' className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-10'>
					{/* Header */}
					<header className='space-y-3 border-b border-border/60 pb-8 text-center sm:text-left'>
						<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold'>
							<ShieldCheck className='w-3.5 h-3.5' />
							<span>Legal Compliance & Data Governance</span>
						</div>
						<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight'>
							GoCart Privacy Policy
						</h1>
						<p className='text-xs sm:text-sm text-muted-foreground'>
							Effective Date: September 2026 · Platform Version: 2.4.0
						</p>
					</header>

					{/* Security Highlights Banner */}
					<div className='grid sm:grid-cols-3 gap-4'>
						<div className='p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1.5'>
							<div className='flex items-center gap-2 text-primary font-bold text-xs uppercase'>
								<Lock className='w-4 h-4' />
								<span>Zero Raw Card Storage</span>
							</div>
							<p className='text-xs text-muted-foreground leading-relaxed'>
								All card credentials and bank payouts are processed directly by Stripe PCI-DSS Level 1 infrastructure.
							</p>
						</div>

						<div className='p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1.5'>
							<div className='flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase'>
								<Database className='w-4 h-4' />
								<span>Tenant Boundary Isolation</span>
							</div>
							<p className='text-xs text-muted-foreground leading-relaxed'>
								Merchants cannot access competing sellers&apos; sales figures or shopper carts across stores.
							</p>
						</div>

						<div className='p-4 rounded-2xl border border-border/80 bg-card shadow-xs space-y-1.5'>
							<div className='flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase'>
								<KeyRound className='w-4 h-4' />
								<span>Full Data Erasure</span>
							</div>
							<p className='text-xs text-muted-foreground leading-relaxed'>
								You can request complete deletion of your account and personal history at any time.
							</p>
						</div>
					</div>

					{/* Policy Document Body */}
					<div className='p-8 sm:p-10 rounded-3xl border border-border/80 bg-card shadow-xs space-y-8 text-sm sm:text-base leading-relaxed text-muted-foreground'>
						<section className='space-y-3'>
							<h2 className='text-xl font-bold text-foreground flex items-center gap-2'>
								<UserCheck className='w-5 h-5 text-primary' />
								<span>1. Information We Collect</span>
							</h2>
							<p>
								GoCart collects only the data strictly required to deliver a reliable, multi-store shopping experience:
							</p>
							<ul className='list-disc pl-5 space-y-2 text-sm'>
								<li>
									<strong className='text-foreground'>Account Data:</strong> Full name, verified email address, profile picture, and role credentials authenticated via Clerk.
								</li>
								<li>
									<strong className='text-foreground'>Order & Parcel Data:</strong> Delivery addresses, selected parcel splits, fulfillment timestamps, and delivery tracking references.
								</li>
								<li>
									<strong className='text-foreground'>Seller Business Credentials:</strong> Store names, logos, announcement banners, return policy matrices, and Stripe Connect onboarding IDs.
								</li>
								<li>
									<strong className='text-foreground'>Diagnostics & Feedback Telemetry:</strong> Optional browser user agent, operating system, and viewport dimensions captured to reproduce bugs when you submit feedback.
								</li>
							</ul>
						</section>

						<section className='space-y-3 pt-4 border-t border-border/40'>
							<h2 className='text-xl font-bold text-foreground flex items-center gap-2'>
								<Eye className='w-5 h-5 text-primary' />
								<span>2. How We Use Collected Data</span>
							</h2>
							<p className='text-sm'>
								We use your information exclusively to:
							</p>
							<ul className='list-disc pl-5 space-y-1.5 text-sm'>
								<li>Authenticate sessions and prevent unauthorized access or account takeovers.</li>
								<li>Coordinate split parcel shipments across distinct independent sellers in a single checkout.</li>
								<li>Calculate daily streak check-ins, reward loyalty coin ledgers, and apply coupons.</li>
								<li>Arbitrate return requests and disputes with cryptographically verifiable evidence.</li>
								<li>Protect the marketplace from automated scraping, credential stuffing, and bot submissions.</li>
							</ul>
						</section>

						<section className='space-y-3 pt-4 border-t border-border/40'>
							<h2 className='text-xl font-bold text-foreground flex items-center gap-2'>
								<Lock className='w-5 h-5 text-primary' />
								<span>3. Multi-Tenant Data Boundary Protection</span>
							</h2>
							<p className='text-sm leading-relaxed'>
								GoCart enforces database-level tenant boundary isolation. Each seller operates exclusively within their own store scope. No seller has administrative privileges or database access to view other vendors&apos; transactions, customer browsing behavior, or financial ledgers.
							</p>
						</section>

						<section className='space-y-3 pt-4 border-t border-border/40'>
							<h2 className='text-xl font-bold text-foreground flex items-center gap-2'>
								<ShieldCheck className='w-5 h-5 text-primary' />
								<span>4. Security Safeguards & Encryption</span>
							</h2>
							<p className='text-sm leading-relaxed'>
								All communications over the wire are encrypted using TLS 1.3. Persistent database records are hosted on isolated cloud infrastructure with row-level permission guards. Cloudinary media uploads are sanitized to prevent server-side request forgery (SSRF) and malicious file execution.
							</p>
						</section>

						<section className='space-y-3 pt-4 border-t border-border/40'>
							<h2 className='text-xl font-bold text-foreground flex items-center gap-2'>
								<FileText className='w-5 h-5 text-primary' />
								<span>5. Your Rights & Data Erasure</span>
							</h2>
							<p className='text-sm leading-relaxed'>
								You retain full ownership of your personal data. You may request an export of your transaction history or full account deletion at any time by contacting us:
							</p>
							<div className='p-4 rounded-2xl bg-muted/30 border border-border/60 text-xs sm:text-sm space-y-1'>
								<p className='font-semibold text-foreground'>Privacy & Compliance Contact:</p>
								<p>
									Email:{' '}
									<a
										href='mailto:rakibhasansohag133@gmail.com'
										className='text-primary font-medium hover:underline'
									>
										rakibhasansohag133@gmail.com
									</a>
								</p>
								<p>
									WhatsApp:{' '}
									<a
										href='https://wa.me/8801760169982'
										className='text-emerald-600 dark:text-emerald-400 font-medium hover:underline'
									>
										+880 1760-169982
									</a>
								</p>
							</div>
						</section>
					</div>
				</main>
			</div>
			<Footer />
		</>
	);
}
