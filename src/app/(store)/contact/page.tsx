import React from 'react';
import type { Metadata } from 'next';
import { Phone, Mail, MapPin, MessageSquare, Clock, Globe, Send, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
	title: 'Contact Us | GoCart Multi-Vendor Marketplace',
	description:
		'Get in touch with the GoCart team, reach platform customer support, or connect with developer Rakib Hasan Sohag.',
};

export default function ContactPage() {
	return (
		<div className='min-h-screen bg-background text-foreground py-10 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-5xl mx-auto space-y-12'>
				{/* Header */}
				<header className='text-center space-y-3 max-w-2xl mx-auto'>
					<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold'>
						<MessageSquare className='w-3.5 h-3.5' />
						<span>24/7 Assistance</span>
					</div>
					<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight'>
						Get in Touch with GoCart
					</h1>
					<p className='text-sm sm:text-base text-muted-foreground leading-relaxed'>
						Have questions about multi-vendor store onboarding, order disputes, or developer integrations? We are here to help.
					</p>
				</header>

				{/* Contact Cards Grid */}
				<div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-6'>
					<div className='p-6 rounded-2xl border border-border bg-card space-y-3'>
						<div className='w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
							<Phone className='w-5 h-5' />
						</div>
						<h3 className='font-bold text-base'>Direct Phone</h3>
						<p className='text-xs text-muted-foreground'>
							Call or SMS for immediate inquiries:
						</p>
						<a
							href='tel:+8801760169982'
							className='inline-block text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline pt-1'
						>
							+880 1760-169982
						</a>
					</div>

					<div className='p-6 rounded-2xl border border-border bg-card space-y-3'>
						<div className='w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
							<Mail className='w-5 h-5' />
						</div>
						<h3 className='font-bold text-base'>Direct Email</h3>
						<p className='text-xs text-muted-foreground'>
							Customer service and developer inquiries:
						</p>
						<a
							href='mailto:rakibhasansohag133@gmail.com'
							className='inline-block text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline pt-1'
						>
							rakibhasansohag133@gmail.com
						</a>
					</div>

					<div className='p-6 rounded-2xl border border-border bg-card space-y-3'>
						<div className='w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
							<Globe className='w-5 h-5' />
						</div>
						<h3 className='font-bold text-base'>WhatsApp Chat</h3>
						<p className='text-xs text-muted-foreground'>
							Instant messaging & collaboration:
						</p>
						<a
							href='https://wa.me/8801760169982?text=Hello%20Rakib%2C%20contacting%20you%20regarding%20GoCart'
							target='_blank'
							rel='noopener noreferrer'
							className='inline-block text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline pt-1'
						>
							+880 1760-169982 →
						</a>
					</div>

					<div className='p-6 rounded-2xl border border-border bg-card space-y-3'>
						<div className='w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
							<MapPin className='w-5 h-5' />
						</div>
						<h3 className='font-bold text-base'>Location & Creator</h3>
						<p className='text-xs text-muted-foreground'>
							Rakib Hasan Sohag:
						</p>
						<p className='text-sm font-semibold text-foreground pt-1'>
							Dhaka, Bangladesh
						</p>
					</div>
				</div>

				{/* Support Hours & Guidelines */}
				<div className='grid md:grid-cols-2 gap-6 p-6 sm:p-8 rounded-3xl border border-border bg-muted/20'>
					<div className='space-y-3'>
						<div className='flex items-center gap-2 font-bold text-foreground'>
							<Clock className='w-4 h-4 text-emerald-500' />
							<span>Response Timeline</span>
						</div>
						<p className='text-sm text-muted-foreground leading-relaxed'>
							We prioritize customer and vendor inquiries with average response times under 12 hours for email communications.
						</p>
					</div>

					<div className='space-y-3'>
						<div className='flex items-center gap-2 font-bold text-foreground'>
							<ShieldCheck className='w-4 h-4 text-emerald-500' />
							<span>Order & Dispute Support</span>
						</div>
						<p className='text-sm text-muted-foreground leading-relaxed'>
							Need help with an ongoing order or refund claim? You can track status and upload evidence directly from your profile dashboard under <strong>Returns & Refunds</strong>.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
