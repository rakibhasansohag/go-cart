import React from 'react';
import type { Metadata } from 'next';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import Header from '@/components/store/layout/header/header';
import Footer from '@/components/store/layout/footer/footer';
import FeedbackForm from '@/components/store/feedback/feedback-form';
import { FeedbackUserRole } from '@/lib/feedback/types';
import {
	Code2,
	Sparkles,
	Clock,
	ShieldCheck,
	HelpCircle,
	ArrowRight,
	ChevronRight,
	Home,
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
	title: 'Platform Feedback & Developer Showcase | GoCart',
	description:
		'Share feature requests, bug reports, UX suggestions, or developer feedback for the GoCart multi-vendor marketplace.',
};

export default async function FeedbackPage() {
	const clerkUser = await currentUser();
	let initialUser = null;

	if (clerkUser) {
		const dbUser = await db.user.findUnique({
			where: { id: clerkUser.id },
			select: { id: true, name: true, email: true, role: true, picture: true },
		});

		let role: FeedbackUserRole = 'CUSTOMER';
		if (dbUser?.role === 'SELLER') role = 'SELLER';

		initialUser = {
			id: clerkUser.id,
			name:
				dbUser?.name ||
				`${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
				'User',
			email: dbUser?.email || clerkUser.emailAddresses[0]?.emailAddress || '',
			picture: dbUser?.picture || clerkUser.imageUrl,
			role,
		};
	}

	return (
		<>
			<Header />
			<div className='min-h-screen bg-slate-50/60 dark:bg-background text-foreground'>
				{/* Top Store Breadcrumb & Back Bar */}
				<div className='border-b border-border/60 bg-background/80 backdrop-blur-xs'>
					<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs'>
						<nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-muted-foreground'>
							<Link href='/' className='inline-flex items-center gap-1 hover:text-foreground transition-colors'>
								<Home className='w-3.5 h-3.5' />
								<span>Home</span>
							</Link>
							<ChevronRight className='w-3.5 h-3.5 opacity-50' />
							<span className='font-medium text-foreground'>Feedback & Observability</span>
						</nav>
						<Link
							href='/'
							className='inline-flex items-center gap-1 font-semibold text-primary hover:underline'
						>
							<span>← Back to Store</span>
						</Link>
					</div>
				</div>

				<main id='main-content' className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10'>
					{/* Hero Header */}
					<header className='text-center space-y-3.5 max-w-2xl mx-auto'>
						<div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold'>
							<Code2 className='w-3.5 h-3.5' />
							<span>Developer Showcase & Platform Observability</span>
						</div>
						<h1 className='text-3xl sm:text-4xl font-extrabold tracking-tight'>
							Shape the GoCart Experience
						</h1>
						<p className='text-sm sm:text-base text-muted-foreground leading-relaxed'>
							Your feedback directly steers our technical roadmap. Whether you are a shopper, merchant, or software engineer evaluating the project, your perspective is highly valued.
						</p>
					</header>

					{/* Two-Column Grid: Form + Info Cards */}
					<div className='grid grid-cols-1 lg:grid-cols-12 gap-8 items-start'>
						{/* Main Form Column (8 cols) */}
						<div className='lg:col-span-8'>
							<FeedbackForm initialUser={initialUser} />
						</div>

						{/* Information & Developer Cards Column (4 cols) */}
						<div className='lg:col-span-4 space-y-6'>
							{/* Engineering Highlight Card */}
							<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3'>
								<div className='w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center'>
									<Sparkles className='w-5 h-5' />
								</div>
								<h3 className='font-bold text-base text-foreground'>
									Software Developer Showcase
								</h3>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									GoCart is built with Next.js 16, React 19, TypeScript, PostgreSQL, Prisma ORM, and Tailwind CSS.
								</p>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Architecture critiques, performance impressions, and feature proposals are thoroughly reviewed.
								</p>
							</div>

							{/* Authenticity Without Friction */}
							<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3'>
								<div className='w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
									<ShieldCheck className='w-5 h-5' />
								</div>
								<h3 className='font-bold text-base text-foreground'>
									Authentic Submissions
								</h3>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Guest submissions undergo real-time syntax validation, disposable domain filtering, and server-side DNS MX record checks without forcing OTP codes.
								</p>
							</div>

							{/* Response SLA */}
							<div className='p-6 rounded-3xl border border-border/80 bg-card shadow-xs space-y-3'>
								<div className='w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center'>
									<Clock className='w-5 h-5' />
								</div>
								<h3 className='font-bold text-base text-foreground'>
									24h Review Timeline
								</h3>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Feedbacks populate the administrator console in real time for triage, status tracking, and release planning.
								</p>
							</div>

							{/* Order Support vs Feedback Notice */}
							<div className='p-5 rounded-2xl border border-border bg-card shadow-xs space-y-2.5 text-xs text-muted-foreground'>
								<div className='flex items-center gap-2 font-semibold text-foreground'>
									<HelpCircle className='w-4 h-4 text-primary' />
									<span>Looking for Order Support?</span>
								</div>
								<p className='leading-relaxed'>
									For delivery inquiries or payment disputes, visit customer support directly:
								</p>
								<div className='flex flex-col gap-1.5 pt-1'>
									<Link
										href='/contact'
										className='inline-flex items-center gap-1 font-medium text-primary hover:underline'
									>
										<span>Contact Us Page</span>
										<ArrowRight className='w-3 h-3' />
									</Link>
									<Link
										href='/profile/returns'
										className='inline-flex items-center gap-1 font-medium text-primary hover:underline'
									>
										<span>Returns & Disputes Portal</span>
										<ArrowRight className='w-3 h-3' />
									</Link>
								</div>
							</div>
						</div>
					</div>
				</main>
			</div>
			<Footer />
		</>
	);
}
