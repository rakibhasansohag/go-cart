'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { CldUploadWidget } from 'next-cloudinary';
import {
	FeedbackCategory,
	FeedbackUserRole,
	DeviceTelemetry,
} from '@/lib/feedback/types';
import { checkEmailTypo } from '@/lib/feedback/email-typo';
import { submitFeedback } from '@/queries/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Star,
	Bug,
	Lightbulb,
	Code2,
	Sparkles,
	MessageSquare,
	ShieldCheck,
	AlertCircle,
	Laptop,
	CheckCircle2,
	Copy,
	Send,
	RefreshCw,
	ChevronDown,
	ChevronUp,
	ImagePlus,
	Trash2,
	X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface InitialUser {
	id: string;
	name: string;
	email: string;
	picture?: string;
	role: FeedbackUserRole;
}

interface FeedbackFormProps {
	initialUser?: InitialUser | null;
}

const CATEGORIES: {
	id: FeedbackCategory;
	label: string;
	desc: string;
	icon: React.ComponentType<{ className?: string }>;
}[] = [
	{
		id: 'FEATURE_REQUEST',
		label: 'Feature Request',
		desc: 'Suggest new workflows, integrations, or capabilities',
		icon: Lightbulb,
	},
	{
		id: 'BUG',
		label: 'Bug Report',
		desc: 'Report UI glitches, broken links, or logic issues',
		icon: Bug,
	},
	{
		id: 'UI_UX',
		label: 'UI & UX Polish',
		desc: 'Critique design layout, micro-animations, or contrast',
		icon: Sparkles,
	},
	{
		id: 'DEVELOPER_IMPRESSION',
		label: 'Code & Architecture',
		desc: 'Share thoughts on stack, performance, or engineering vibe',
		icon: Code2,
	},
	{
		id: 'GENERAL',
		label: 'General / Praise',
		desc: 'Overall experience, impressions, or testimonials',
		icon: MessageSquare,
	},
];

const ROLES: { id: FeedbackUserRole; label: string }[] = [
	{ id: 'GUEST', label: 'Guest Visitor' },
	{ id: 'CUSTOMER', label: 'Shopper' },
	{ id: 'SELLER', label: 'Merchant / Seller' },
	{ id: 'DEVELOPER', label: 'Software Engineer / Recruiter' },
];

const RATING_LABELS: Record<number, string> = {
	1: 'Needs Work',
	2: 'Below Expectation',
	3: 'Good Baseline',
	4: 'Great Experience',
	5: 'Outstanding Craftsmanship',
};

export default function FeedbackForm({ initialUser }: FeedbackFormProps) {
	const [name, setName] = useState(initialUser?.name || '');
	const [email, setEmail] = useState(initialUser?.email || '');
	const [role, setRole] = useState<FeedbackUserRole>(
		initialUser?.role || 'GUEST',
	);
	const [category, setCategory] = useState<FeedbackCategory>('FEATURE_REQUEST');
	const [rating, setRating] = useState<number>(5);
	const [subject, setSubject] = useState('');
	const [message, setMessage] = useState('');
	const [images, setImages] = useState<string[]>([]);
	const [botHoneypot, setBotHoneypot] = useState('');

	const [telemetry, setTelemetry] = useState<DeviceTelemetry>({});
	const [showTelemetry, setShowTelemetry] = useState(false);
	const [emailTypoSuggestion, setEmailTypoSuggestion] = useState<string | undefined>();

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [ticketCode, setTicketCode] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	// Collect client device diagnostics
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const ua = window.navigator.userAgent;
			let browser = 'Browser';
			if (ua.includes('Firefox')) browser = 'Firefox';
			else if (ua.includes('Edg')) browser = 'Microsoft Edge';
			else if (ua.includes('Chrome')) browser = 'Google Chrome';
			else if (ua.includes('Safari')) browser = 'Apple Safari';

			let os = 'OS';
			if (ua.includes('Windows')) os = 'Windows';
			else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
			else if (ua.includes('Linux')) os = 'Linux';
			else if (ua.includes('Android')) os = 'Android';
			else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

			setTelemetry({
				browser,
				os,
				screenResolution: `${window.screen.width}x${window.screen.height}`,
				viewportSize: `${window.innerWidth}x${window.innerHeight}`,
				path: window.location.pathname,
				referrer: document.referrer || 'Direct Visit',
				language: window.navigator.language,
			});
		}
	}, []);

	// Email typo suggestion on guest typing
	const handleEmailChange = (val: string) => {
		setEmail(val);
		if (!initialUser) {
			const suggestion = checkEmailTypo(val);
			setEmailTypoSuggestion(suggestion);
		}
	};

	const applySuggestion = () => {
		if (emailTypoSuggestion) {
			setEmail(emailTypoSuggestion);
			setEmailTypoSuggestion(undefined);
		}
	};

	const handleUploadSuccess = (result: { info?: { secure_url?: string } | string }) => {
		if (typeof result.info === 'object' && result.info?.secure_url) {
			const newUrl = result.info.secure_url;
			setImages((prev) => {
				if (prev.length >= 5) {
					toast.error('Maximum 5 images allowed');
					return prev;
				}
				if (prev.includes(newUrl)) return prev;
				return [...prev, newUrl];
			});
			toast.success('Screenshot uploaded');
		}
	};

	const handleRemoveImage = (indexToRemove: number) => {
		setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast.error('Please enter your name');
			return;
		}

		if (!email.trim()) {
			toast.error('Please enter your email address');
			return;
		}

		if (subject.trim().length < 4) {
			toast.error('Subject must be at least 4 characters');
			return;
		}

		if (message.trim().length < 10) {
			toast.error('Please provide a message with at least 10 characters');
			return;
		}

		setIsSubmitting(true);

		try {
			const res = await submitFeedback({
				name: name.trim(),
				email: email.trim(),
				role,
				category,
				rating,
				subject: subject.trim(),
				message: message.trim(),
				images,
				deviceInfo: telemetry,
				botHoneypot,
			});

			if (res.success) {
				setTicketCode(res.ticketCode);
				toast.success('Feedback recorded successfully!');
			}
		} catch (error: unknown) {
			const errMsg = error instanceof Error ? error.message : 'Failed to submit feedback.';
			toast.error(errMsg);
		} finally {
			setIsSubmitting(false);
		}
	};

	const copyTicketCode = () => {
		if (ticketCode) {
			navigator.clipboard.writeText(ticketCode);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			toast.success('Ticket code copied to clipboard');
		}
	};

	const resetForm = () => {
		setTicketCode(null);
		setSubject('');
		setMessage('');
		setImages([]);
		setRating(5);
		if (!initialUser) {
			setName('');
			setEmail('');
		}
	};

	return (
		<div className='relative w-full'>
			{/* Success Confirmation Modal */}
			<AnimatePresence>
				{ticketCode && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'
					>
						<motion.div
							initial={{ scale: 0.95, y: 15, opacity: 0 }}
							animate={{ scale: 1, y: 0, opacity: 1 }}
							exit={{ scale: 0.95, y: 15, opacity: 0 }}
							className='w-full max-w-lg rounded-3xl bg-card border border-border/80 shadow-2xl p-6 sm:p-8 space-y-6 text-foreground'
						>
							<div className='flex items-center gap-3'>
								<div className='w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center'>
									<CheckCircle2 className='w-7 h-7' />
								</div>
								<div>
									<h3 className='text-xl font-bold'>Feedback Received</h3>
									<p className='text-xs text-muted-foreground'>
										Thank you for taking the time to share your perspective.
									</p>
								</div>
							</div>

							<div className='p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3'>
								<div className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
									Your Feedback Reference ID
								</div>
								<div className='flex items-center justify-between gap-2 p-3 rounded-xl bg-background border border-border'>
									<span className='font-mono font-bold text-lg text-foreground tracking-wider'>
										{ticketCode}
									</span>
									<Button
										type='button'
										variant='ghost'
										size='sm'
										onClick={copyTicketCode}
										className='gap-1.5 text-xs'
									>
										<Copy className='w-3.5 h-3.5' />
										<span>{copied ? 'Copied' : 'Copy Code'}</span>
									</Button>
								</div>
								<p className='text-xs text-muted-foreground leading-relaxed'>
									Your authentic submission is logged in the admin console. If you included a feature suggestion or bug reproduction, our engineering pipeline reviews items within 24 hours.
								</p>
							</div>

							<div className='flex items-center justify-end gap-3 pt-2'>
								<Button
									type='button'
									variant='outline'
									onClick={resetForm}
									className='gap-2'
								>
									<RefreshCw className='w-4 h-4' />
									<span>Submit Another</span>
								</Button>
								<Button
									type='button'
									onClick={() => (window.location.href = '/')}
								>
									Return to Marketplace
								</Button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<form
				onSubmit={handleSubmit}
				className='space-y-8 bg-card border border-border/80 rounded-3xl p-6 sm:p-10 shadow-sm'
			>
				{/* Hidden Honeypot Field for Spambots */}
				<input
					type='text'
					name='bot_website_catch'
					value={botHoneypot}
					onChange={(e) => setBotHoneypot(e.target.value)}
					className='hidden'
					tabIndex={-1}
					autoComplete='off'
				/>

				{/* 1. Perspective / Role Selector */}
				<div className='space-y-3'>
					<label className='block text-sm font-semibold text-foreground'>
						1. What is your perspective today?
					</label>
					<div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
						{ROLES.map((r) => {
							const isSelected = role === r.id;
							return (
								<button
									key={r.id}
									type='button'
									onClick={() => setRole(r.id)}
									className={`px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium border text-center transition-all cursor-pointer ${
										isSelected
											? 'bg-primary text-primary-foreground border-primary shadow-xs'
											: 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
									}`}
								>
									{r.label}
								</button>
							);
						})}
					</div>
				</div>

				{/* 2. Category Cards */}
				<div className='space-y-3'>
					<label className='block text-sm font-semibold text-foreground'>
						2. Select Feedback Category
					</label>
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
						{CATEGORIES.map((cat) => {
							const isSelected = category === cat.id;
							const Icon = cat.icon;
							return (
								<button
									key={cat.id}
									type='button'
									onClick={() => setCategory(cat.id)}
									className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
										isSelected
											? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
											: 'border-border bg-card hover:bg-muted/40 text-foreground'
									}`}
								>
									<div className='flex items-center gap-2.5 mb-2'>
										<div
											className={`w-8 h-8 rounded-lg flex items-center justify-center ${
												isSelected
													? 'bg-primary text-primary-foreground'
													: 'bg-muted text-muted-foreground'
											}`}
										>
											<Icon className='w-4 h-4' />
										</div>
										<span className='font-bold text-sm text-foreground'>
											{cat.label}
										</span>
									</div>
									<p className='text-xs text-muted-foreground leading-relaxed'>
										{cat.desc}
									</p>
								</button>
							);
						})}
					</div>
				</div>

				{/* 3. Star Sentiment Rating */}
				<div className='space-y-3'>
					<div className='flex items-center justify-between'>
						<label className='block text-sm font-semibold text-foreground'>
							3. Overall Platform Rating
						</label>
						<span className='text-xs font-semibold text-primary'>
							{RATING_LABELS[rating]}
						</span>
					</div>
					<div className='flex items-center gap-2'>
						{[1, 2, 3, 4, 5].map((star) => (
							<button
								key={star}
								type='button'
								onClick={() => setRating(star)}
								className='p-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group'
								title={`${star} Star - ${RATING_LABELS[star]}`}
							>
								<Star
									className={`w-6 h-6 transition-all duration-150 ${
										star <= rating
											? 'fill-amber-400 text-amber-400 scale-105'
											: 'text-muted-foreground/30 hover:text-muted-foreground'
									}`}
								/>
							</button>
						))}
					</div>
				</div>

				{/* 4. Sender Information */}
				<div className='space-y-4 pt-2 border-t border-border/40'>
					<div className='flex items-center justify-between'>
						<label className='block text-sm font-semibold text-foreground'>
							4. Your Contact Details
						</label>
						{initialUser && (
							<div className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold'>
								<ShieldCheck className='w-3.5 h-3.5' />
								<span>Account Verified</span>
							</div>
						)}
					</div>

					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<div className='space-y-1.5'>
							<span className='text-xs text-muted-foreground font-medium'>
								Your Name
							</span>
							<Input
								type='text'
								placeholder='e.g., Alex Johnson'
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={Boolean(initialUser?.name)}
								required
								className='h-11 rounded-xl'
							/>
						</div>

						<div className='space-y-1.5'>
							<div className='flex items-center justify-between'>
								<span className='text-xs text-muted-foreground font-medium'>
									Authentic Email Address
								</span>
								{!initialUser && (
									<span className='text-[10px] text-muted-foreground'>
										No OTP required · MX verified
									</span>
								)}
							</div>
							<Input
								type='email'
								placeholder='e.g., alex@company.com'
								value={email}
								onChange={(e) => handleEmailChange(e.target.value)}
								disabled={Boolean(initialUser?.email)}
								required
								className='h-11 rounded-xl'
							/>
							{/* Inline Typo Suggestion */}
							{emailTypoSuggestion && !initialUser && (
								<motion.div
									initial={{ opacity: 0, y: -4 }}
									animate={{ opacity: 1, y: 0 }}
									className='flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-xs'
								>
									<AlertCircle className='w-3.5 h-3.5 shrink-0' />
									<span>
										Did you mean <strong>{emailTypoSuggestion}</strong>?
									</span>
									<button
										type='button'
										onClick={applySuggestion}
										className='ml-auto font-bold underline cursor-pointer hover:opacity-80'
									>
										Apply
									</button>
								</motion.div>
							)}
						</div>
					</div>
				</div>

				{/* 5. Subject & Detailed Message */}
				<div className='space-y-4 pt-2 border-t border-border/40'>
					<div className='flex items-center justify-between'>
						<label className='block text-sm font-semibold text-foreground'>
							5. Feedback Content
						</label>
					</div>

					<div className='space-y-1.5'>
						<div className='flex items-center justify-between'>
							<span className='text-xs text-muted-foreground font-medium'>
								Subject / Title
							</span>
							<span className='text-[10px] text-muted-foreground'>
								{subject.length}/120
							</span>
						</div>
						<Input
							type='text'
							maxLength={120}
							placeholder={
								category === 'BUG'
									? 'e.g., Cart total displays unexpected cents on Firefox mobile'
									: category === 'FEATURE_REQUEST'
									? 'e.g., Add Google Pay one-click checkout option'
									: category === 'DEVELOPER_IMPRESSION'
									? 'e.g., Impressions on Next.js 16 app router state flow'
									: 'e.g., Great checkout responsiveness on mobile'
							}
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
							required
							className='h-11 rounded-xl'
						/>
					</div>

					<div className='space-y-1.5'>
						<div className='flex items-center justify-between'>
							<span className='text-xs text-muted-foreground font-medium'>
								Detailed Description
							</span>
							<span className='text-[10px] text-muted-foreground'>
								{message.length}/3000
							</span>
						</div>
						<Textarea
							rows={6}
							maxLength={3000}
							placeholder={
								category === 'BUG'
									? 'Please describe steps to reproduce, expected vs actual behavior, or errors observed...'
									: category === 'DEVELOPER_IMPRESSION'
									? 'Share your review of the engineering architecture, data fetching, database models, or UX craft...'
									: 'Share your feedback, ideas, or suggestions for making GoCart better...'
							}
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							required
							className='rounded-2xl p-4 text-sm leading-relaxed'
						/>
					</div>
				</div>

				{/* 6. Image Attachments (Up to 5 images, max 5MB each, saved to 'feedback' folder in Cloudinary) */}
				<div className='space-y-3 pt-2 border-t border-border/40'>
					<div className='flex items-center justify-between'>
						<label className='block text-sm font-semibold text-foreground'>
							6. Attach Screenshots or Images <span className='text-xs font-normal text-muted-foreground'>(Optional)</span>
						</label>
						<span className='text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground'>
							{images.length}/5 uploaded
						</span>
					</div>

					<p className='text-xs text-muted-foreground'>
						Attach screenshots, UI mockups, or error photos (PNG, JPG, WEBP, up to 5MB each).
					</p>

					<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1'>
						{images.map((imgUrl, idx) => (
							<div
								key={imgUrl}
								className='group relative aspect-square rounded-2xl overflow-hidden border border-border/80 bg-muted/30 shadow-xs'
							>
								<Image
									src={imgUrl}
									alt={`Attachment ${idx + 1}`}
									fill
									sizes='(max-width: 768px) 50vw, 20vw'
									className='object-cover transition-transform group-hover:scale-105'
								/>
								<button
									type='button'
									onClick={() => handleRemoveImage(idx)}
									className='absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-sm z-10'
									title='Remove image'
									aria-label={`Remove image ${idx + 1}`}
								>
									<Trash2 className='w-3.5 h-3.5' />
								</button>
								<div className='absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-mono z-10'>
									#{idx + 1}
								</div>
							</div>
						))}

						{images.length < 5 && (
							<CldUploadWidget
								uploadPreset={
									process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET ||
									'go-cart-ecommerce'
								}
								onSuccess={handleUploadSuccess}
								onClose={() => {
									if (typeof document !== 'undefined') {
										document.body.style.pointerEvents = 'auto';
										document.body.style.overflow = 'auto';
									}
								}}
								options={{
									multiple: true,
									maxFiles: 5 - images.length,
									maxFileSize: 5 * 1024 * 1024,
									folder: 'feedback',
									resourceType: 'image',
									clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
								}}
							>
								{({ open }) => (
									<button
										type='button'
										onClick={() => open()}
										className='group aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary/60 bg-muted/10 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all cursor-pointer p-3 text-center'
									>
										<div className='w-9 h-9 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors'>
											<ImagePlus className='w-5 h-5' />
										</div>
										<span className='text-xs font-semibold'>
											Upload Image
										</span>
										<span className='text-[10px] text-muted-foreground/80 leading-tight'>
											Max 5MB
										</span>
									</button>
								)}
							</CldUploadWidget>
						)}
					</div>
				</div>

				{/* 7. Diagnostics Telemetry Disclosure */}
				<div className='rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3'>
					<button
						type='button'
						onClick={() => setShowTelemetry(!showTelemetry)}
						className='w-full flex items-center justify-between text-xs font-semibold text-foreground cursor-pointer'
					>
						<div className='flex items-center gap-2 text-muted-foreground'>
							<Laptop className='w-4 h-4 text-primary' />
							<span>Diagnostic Context (Auto-attached to help reproduction)</span>
						</div>
						<div className='flex items-center gap-1 text-muted-foreground'>
							<span>{showTelemetry ? 'Hide' : 'Inspect'}</span>
							{showTelemetry ? (
								<ChevronUp className='w-3.5 h-3.5' />
							) : (
								<ChevronDown className='w-3.5 h-3.5' />
							)}
						</div>
					</button>

					{showTelemetry && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: 'auto', opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							className='pt-2 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]'
						>
							<div>
								<span className='text-muted-foreground block'>Browser</span>
								<span className='font-mono font-medium text-foreground'>
									{telemetry.browser || 'Detecting...'}
								</span>
							</div>
							<div>
								<span className='text-muted-foreground block'>OS</span>
								<span className='font-mono font-medium text-foreground'>
									{telemetry.os || 'Detecting...'}
								</span>
							</div>
							<div>
								<span className='text-muted-foreground block'>Screen</span>
								<span className='font-mono font-medium text-foreground'>
									{telemetry.screenResolution || 'Detecting...'}
								</span>
							</div>
							<div>
								<span className='text-muted-foreground block'>Viewport</span>
								<span className='font-mono font-medium text-foreground'>
									{telemetry.viewportSize || 'Detecting...'}
								</span>
							</div>
						</motion.div>
					)}
				</div>

				{/* Submit Button */}
				<div className='pt-2 flex items-center justify-end gap-4'>
					<Button
						type='submit'
						size='lg'
						disabled={isSubmitting}
						className='h-12 px-8 rounded-2xl gap-2 font-bold'
					>
						{isSubmitting ? (
							<>
								<RefreshCw className='w-4 h-4 animate-spin' />
								<span>Verifying & Sending...</span>
							</>
						) : (
							<>
								<Send className='w-4 h-4' />
								<span>Send Feedback</span>
							</>
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
