import {
	FeedbackCategory,
	FeedbackStatus,
	FeedbackUserRole,
} from '@prisma/client';

export type { FeedbackCategory, FeedbackStatus, FeedbackUserRole };

export interface DeviceTelemetry {
	browser?: string;
	os?: string;
	screenResolution?: string;
	viewportSize?: string;
	path?: string;
	referrer?: string;
	language?: string;
}

export interface FeedbackSubmissionPayload {
	name: string;
	email: string;
	role: FeedbackUserRole;
	category: FeedbackCategory;
	rating?: number;
	subject: string;
	message: string;
	images?: string[];
	deviceInfo?: DeviceTelemetry;
	botHoneypot?: string;
}

export interface FeedbackFilterParams {
	status?: FeedbackStatus | 'ALL';
	category?: FeedbackCategory | 'ALL';
	role?: FeedbackUserRole | 'ALL';
	search?: string;
	page?: number;
	limit?: number;
}

export interface FeedbackAdminMetrics {
	total: number;
	newCount: number;
	inReviewCount: number;
	plannedCount: number;
	resolvedCount: number;
	archivedCount: number;
	bugCount: number;
	featureCount: number;
	averageRating: number | null;
}

export interface EmailValidationResult {
	isValid: boolean;
	isAuthentic: boolean;
	suggestion?: string;
	reason?: string;
}
