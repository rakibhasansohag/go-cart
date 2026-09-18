'use server';

import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
	Feedback,
	FeedbackCategory,
	FeedbackStatus,
	FeedbackUserRole,
	Prisma,
} from '@prisma/client';
import {
	FeedbackAdminMetrics,
	FeedbackFilterParams,
	FeedbackSubmissionPayload,
} from '@/lib/feedback/types';
import { FeedbackFormSchema } from '@/lib/feedback/schema';
import {
	isBotSubmission,
	verifyEmailAuthenticity,
} from '@/lib/feedback/email-verification';
import { revalidatePath } from 'next/cache';

/**
 * Submit feedback from a guest, customer, seller, or developer.
 * Uses multi-tier email authenticity validation for guests without forcing OTP.
 */
export async function submitFeedback(
	payload: FeedbackSubmissionPayload,
): Promise<{ success: boolean; ticketCode: string; message: string }> {
	// 1. Check honeypot: silently drop bots
	if (isBotSubmission(payload.botHoneypot)) {
		return {
			success: true,
			ticketCode: `FB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
			message: 'Thank you for your feedback.',
		};
	}

	// 2. Validate input schema with Zod
	const parsed = FeedbackFormSchema.safeParse({
		name: payload.name,
		email: payload.email,
		role: payload.role,
		category: payload.category,
		rating: payload.rating,
		subject: payload.subject,
		message: payload.message,
		images: payload.images,
		botHoneypot: payload.botHoneypot,
	});

	if (!parsed.success) {
		const firstError = parsed.error.issues[0]?.message || 'Invalid form data';
		throw new Error(firstError);
	}

	const data = parsed.data;

	// 3. Authenticate current session if available
	const clerkUser = await currentUser();
	let userId: string | null = null;
	let isEmailVerified = false;
	let finalName = data.name;
	let finalEmail = data.email;
	let finalRole: FeedbackUserRole = data.role as FeedbackUserRole;

	if (clerkUser) {
		userId = clerkUser.id;
		isEmailVerified = true;

		// Fetch existing user in db to check role
		const dbUser = await db.user.findUnique({
			where: { id: clerkUser.id },
			select: { role: true, name: true, email: true },
		});

		if (dbUser) {
			finalEmail = dbUser.email;
			if (!finalName || finalName.trim() === '') {
				finalName = dbUser.name || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';
			}
			if (dbUser.role === 'SELLER' && finalRole === 'GUEST') {
				finalRole = 'SELLER';
			} else if (dbUser.role === 'USER' && finalRole === 'GUEST') {
				finalRole = 'CUSTOMER';
			}
		}
	} else {
		// 4. Guest user: verify email authenticity via syntax, disposable check, and DNS MX record
		const verification = await verifyEmailAuthenticity(finalEmail);
		if (!verification.isValid || !verification.isAuthentic) {
			const reason = verification.reason || 'Please provide an authentic email address.';
			const suggestionNote = verification.suggestion
				? ` Did you mean ${verification.suggestion}?`
				: '';
			throw new Error(`${reason}${suggestionNote}`);
		}
		isEmailVerified = true;
	}

	// 5. Create Feedback record
	const feedback = await db.feedback.create({
		data: {
			name: finalName,
			email: finalEmail,
			role: finalRole,
			userId,
			category: data.category as FeedbackCategory,
			rating: data.rating,
			subject: data.subject,
			message: data.message,
			images: data.images || [],
			deviceInfo: payload.deviceInfo
				? (payload.deviceInfo as unknown as Prisma.InputJsonValue)
				: Prisma.JsonNull,
			status: 'NEW',
			isEmailVerified,
		},
	});

	const ticketCode = `FB-${feedback.id.slice(0, 8).toUpperCase()}`;

	revalidatePath('/dashboard/admin/feedback');

	return {
		success: true,
		ticketCode,
		message: 'Your feedback has been submitted successfully!',
	};
}

/**
 * Fetch feedbacks with filters and summary metrics for Admin console.
 * Admin-only protected.
 */
export async function getAdminFeedbacks(
	params: FeedbackFilterParams = {},
): Promise<{
	feedbacks: Feedback[];
	totalCount: number;
	totalPages: number;
	currentPage: number;
	metrics: FeedbackAdminMetrics;
}> {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});

	if (dbUser?.role !== 'ADMIN') {
		throw new Error('Forbidden: Admin access required.');
	}

	const page = Math.max(1, params.page || 1);
	const limit = Math.min(50, Math.max(5, params.limit || 15));
	const skip = (page - 1) * limit;

	const where: Prisma.FeedbackWhereInput = {};

	if (params.status && params.status !== 'ALL') {
		where.status = params.status;
	}

	if (params.category && params.category !== 'ALL') {
		where.category = params.category;
	}

	if (params.role && params.role !== 'ALL') {
		where.role = params.role;
	}

	if (params.search && params.search.trim() !== '') {
		const q = params.search.trim();
		where.OR = [
			{ name: { contains: q, mode: 'insensitive' } },
			{ email: { contains: q, mode: 'insensitive' } },
			{ subject: { contains: q, mode: 'insensitive' } },
			{ message: { contains: q, mode: 'insensitive' } },
		];
	}

	const [feedbacks, totalCount, statusCounts, bugCount, featureCount, avgResult] =
		await Promise.all([
			db.feedback.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit,
			}),
			db.feedback.count({ where }),
			db.feedback.groupBy({
				by: ['status'],
				_count: { _all: true },
			}),
			db.feedback.count({ where: { category: 'BUG' } }),
			db.feedback.count({ where: { category: 'FEATURE_REQUEST' } }),
			db.feedback.aggregate({
				_avg: { rating: true },
				where: { rating: { not: null } },
			}),
		]);

	const statusMap = new Map<FeedbackStatus, number>();
	let totalAll = 0;
	statusCounts.forEach((s) => {
		statusMap.set(s.status, s._count._all);
		totalAll += s._count._all;
	});

	const metrics: FeedbackAdminMetrics = {
		total: totalAll,
		newCount: statusMap.get('NEW') || 0,
		inReviewCount: statusMap.get('IN_REVIEW') || 0,
		plannedCount: statusMap.get('PLANNED') || 0,
		resolvedCount: statusMap.get('RESOLVED') || 0,
		archivedCount: statusMap.get('ARCHIVED') || 0,
		bugCount,
		featureCount,
		averageRating: avgResult._avg.rating
			? Number(avgResult._avg.rating.toFixed(1))
			: null,
	};

	return {
		feedbacks,
		totalCount,
		totalPages: Math.ceil(totalCount / limit) || 1,
		currentPage: page,
		metrics,
	};
}

/**
 * Update status and admin notes on a feedback item.
 * Admin-only.
 */
export async function updateFeedbackStatus(
	id: string,
	update: { status: FeedbackStatus; adminNotes?: string },
): Promise<Feedback> {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});

	if (dbUser?.role !== 'ADMIN') {
		throw new Error('Forbidden: Admin access required.');
	}

	const updated = await db.feedback.update({
		where: { id },
		data: {
			status: update.status,
			adminNotes: update.adminNotes,
		},
	});

	revalidatePath('/dashboard/admin/feedback');
	return updated;
}

/**
 * Delete a feedback item.
 * Admin-only.
 */
export async function deleteFeedback(id: string): Promise<boolean> {
	const user = await currentUser();
	if (!user) throw new Error('Unauthenticated.');

	const dbUser = await db.user.findUnique({
		where: { id: user.id },
		select: { role: true },
	});

	if (dbUser?.role !== 'ADMIN') {
		throw new Error('Forbidden: Admin access required.');
	}

	await db.feedback.delete({
		where: { id },
	});

	revalidatePath('/dashboard/admin/feedback');
	return true;
}
