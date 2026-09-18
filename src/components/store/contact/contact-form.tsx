'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send, CheckCircle2, Loader2, MessageSquare, AlertCircle } from 'lucide-react';

interface ContactFormData {
	name: string;
	email: string;
	topic: string;
	orderNumber: string;
	subject: string;
	message: string;
}

const TOPICS = [
	{ value: 'ORDER_STATUS', label: 'Order Status & Parcel Tracking' },
	{ value: 'RETURNS_REFUNDS', label: 'Returns, Refunds & Exchanges' },
	{ value: 'SELLER_PARTNERSHIP', label: 'Seller & Store Partnerships' },
	{ value: 'PAYMENT_CHECKOUT', label: 'Payment & Checkout Inquiries' },
	{ value: 'PRODUCT_INQUIRY', label: 'Product Details & Stock Availability' },
	{ value: 'GENERAL_SUPPORT', label: 'General Marketplace Inquiry' },
];

export default function ContactForm() {
	const [formData, setFormData] = useState<ContactFormData>({
		name: '',
		email: '',
		topic: 'ORDER_STATUS',
		orderNumber: '',
		subject: '',
		message: '',
	});
	const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
			toast.error('Please complete all required fields.');
			return;
		}

		startTransition(async () => {
			// Simulate brief dispatch to support pipeline
			await new Promise((resolve) => setTimeout(resolve, 800));
			const ticket = `GC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
			setSubmittedTicket(ticket);
			toast.success('Your message has been received by our support team.');
		});
	};

	const handleReset = () => {
		setSubmittedTicket(null);
		setFormData({
			name: '',
			email: '',
			topic: 'ORDER_STATUS',
			orderNumber: '',
			subject: '',
			message: '',
		});
	};

	if (submittedTicket) {
		return (
			<div className='rounded-2xl border border-border bg-card p-8 sm:p-10 text-center space-y-5 shadow-xs'>
				<div className='w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5'>
					<CheckCircle2 className='w-7 h-7' />
				</div>
				<div className='space-y-2 max-w-md mx-auto'>
					<h3 className='text-xl font-bold text-foreground tracking-tight'>
						Message Received Successfully
					</h3>
					<p className='text-sm text-muted-foreground leading-relaxed'>
						Thank you for contacting GoCart support. Your inquiry has been routed to our customer assistance desk.
					</p>
				</div>
				<div className='p-4 rounded-xl bg-muted/40 border border-border/80 inline-block text-left w-full max-w-sm'>
					<span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1'>
						Support Ticket Reference
					</span>
					<span className='font-mono font-bold text-base text-foreground'>
						{submittedTicket}
					</span>
					<p className='text-xs text-muted-foreground mt-1'>
						A copy of this ticket will be replied to at <strong className='text-foreground'>{formData.email}</strong>.
					</p>
				</div>
				<div>
					<Button
						type='button'
						onClick={handleReset}
						variant='outline'
						className='text-sm font-medium'
					>
						Send Another Inquiry
					</Button>
				</div>
			</div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className='rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-xs'
		>
			<div className='space-y-1 border-b border-border/60 pb-4'>
				<div className='flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider'>
					<MessageSquare className='w-4 h-4 text-orange-500' />
					<span>Send a Direct Message</span>
				</div>
				<h2 className='text-xl font-bold text-foreground tracking-tight'>
					How Can Our Team Help You?
				</h2>
				<p className='text-xs text-muted-foreground'>
					Fill out the form below and our customer support representatives will respond within 2-4 business hours.
				</p>
			</div>

			<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
				<div className='space-y-1.5'>
					<label htmlFor='contact-name' className='text-xs font-semibold text-foreground flex items-center gap-1'>
						<span>Full Name</span>
						<span className='text-red-500'>*</span>
					</label>
					<Input
						id='contact-name'
						name='name'
						type='text'
						required
						placeholder='e.g., Alex Johnson'
						value={formData.name}
						onChange={handleChange}
						className='bg-background text-sm'
					/>
				</div>

				<div className='space-y-1.5'>
					<label htmlFor='contact-email' className='text-xs font-semibold text-foreground flex items-center gap-1'>
						<span>Email Address</span>
						<span className='text-red-500'>*</span>
					</label>
					<Input
						id='contact-email'
						name='email'
						type='email'
						required
						placeholder='e.g., alex@domain.com'
						value={formData.email}
						onChange={handleChange}
						className='bg-background text-sm'
					/>
				</div>
			</div>

			<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
				<div className='space-y-1.5'>
					<label htmlFor='contact-topic' className='text-xs font-semibold text-foreground'>
						Inquiry Department
					</label>
					<select
						id='contact-topic'
						name='topic'
						value={formData.topic}
						onChange={handleChange}
						className='w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
					>
						{TOPICS.map((t) => (
							<option key={t.value} value={t.value}>
								{t.label}
							</option>
						))}
					</select>
				</div>

				<div className='space-y-1.5'>
					<label htmlFor='contact-order' className='text-xs font-semibold text-foreground flex items-center justify-between'>
						<span>Order ID</span>
						<span className='text-[10px] text-muted-foreground font-normal'>Optional</span>
					</label>
					<Input
						id='contact-order'
						name='orderNumber'
						type='text'
						placeholder='e.g., ORD-829103'
						value={formData.orderNumber}
						onChange={handleChange}
						className='bg-background text-sm'
					/>
				</div>
			</div>

			<div className='space-y-1.5'>
				<label htmlFor='contact-subject' className='text-xs font-semibold text-foreground flex items-center gap-1'>
					<span>Subject</span>
					<span className='text-red-500'>*</span>
				</label>
				<Input
					id='contact-subject'
					name='subject'
					type='text'
					required
					placeholder='Brief summary of your inquiry'
					value={formData.subject}
					onChange={handleChange}
					className='bg-background text-sm'
				/>
			</div>

			<div className='space-y-1.5'>
				<label htmlFor='contact-message' className='text-xs font-semibold text-foreground flex items-center gap-1'>
					<span>Detailed Message</span>
					<span className='text-red-500'>*</span>
				</label>
				<Textarea
					id='contact-message'
					name='message'
					required
					rows={4}
					placeholder='Please describe your question or issue in detail so we can assist you promptly...'
					value={formData.message}
					onChange={handleChange}
					className='bg-background text-sm leading-relaxed'
				/>
			</div>

			<div className='flex items-center justify-between pt-2 border-t border-border/60'>
				<p className='text-[11px] text-muted-foreground flex items-center gap-1.5'>
					<AlertCircle className='w-3.5 h-3.5 text-muted-foreground shrink-0' />
					<span>We protect your data according to our privacy policy.</span>
				</p>
				<Button
					type='submit'
					disabled={isPending}
					className='bg-gradient-to-r from-red-600 to-orange-500 hover:opacity-90 text-white font-semibold px-6 shadow-sm cursor-pointer'
				>
					{isPending ? (
						<span className='inline-flex items-center gap-2'>
							<Loader2 className='w-4 h-4 animate-spin' />
							<span>Sending...</span>
						</span>
					) : (
						<span className='inline-flex items-center gap-2'>
							<Send className='w-4 h-4' />
							<span>Send Message</span>
						</span>
					)}
				</Button>
			</div>
		</form>
	);
}
