import { z } from 'zod';

export const FeedbackFormSchema = z.object({
	name: z
		.string()
		.min(2, 'Name must be at least 2 characters')
		.max(80, 'Name must be under 80 characters')
		.trim(),
	email: z
		.string()
		.email('Please enter a valid email address')
		.max(120, 'Email address is too long')
		.trim()
		.toLowerCase(),
	role: z.enum(['GUEST', 'CUSTOMER', 'SELLER', 'DEVELOPER']),
	category: z.enum([
		'BUG',
		'FEATURE_REQUEST',
		'UI_UX',
		'DEVELOPER_IMPRESSION',
		'GENERAL',
	]),
	rating: z.coerce.number().int().min(1).max(5).optional(),
	subject: z
		.string()
		.min(4, 'Subject must be at least 4 characters')
		.max(120, 'Subject must be under 120 characters')
		.trim(),
	message: z
		.string()
		.min(10, 'Feedback message must be at least 10 characters')
		.max(3000, 'Feedback message must be under 3000 characters')
		.trim(),
	images: z
		.array(z.string().url('Invalid image URL'))
		.max(5, 'You can upload up to 5 images')
		.optional()
		.default([]),
	botHoneypot: z.string().optional(),
});

export type FeedbackFormValues = z.infer<typeof FeedbackFormSchema>;
