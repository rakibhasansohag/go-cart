import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitFeedback } from './feedback';
import { db } from '@/lib/db';

// Mock Clerk auth currentUser to simulate a guest by default
vi.mock('@clerk/nextjs/server', () => ({
	currentUser: vi.fn().mockResolvedValue(null),
	auth: vi.fn().mockResolvedValue({ userId: null }),
}));

// Mock revalidatePath
vi.mock('next/cache', () => ({
	revalidatePath: vi.fn(),
}));

describe('Feedback Query & Server Actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('silently accepts and drops honeypot bot submissions', async () => {
		const result = await submitFeedback({
			name: 'Spam Bot',
			email: 'bot@spam.com',
			role: 'GUEST',
			category: 'GENERAL',
			subject: 'Spam Subject Here',
			message: 'This is spam content for test',
			botHoneypot: 'filled_by_bot',
		});

		expect(result.success).toBe(true);
		expect(result.ticketCode).toMatch(/^FB-/);
	});

	it('rejects submissions with invalid email syntax', async () => {
		await expect(
			submitFeedback({
				name: 'John Doe',
				email: 'not-an-email',
				role: 'GUEST',
				category: 'GENERAL',
				subject: 'Valid Subject Line',
				message: 'This is a valid message for feedback testing.',
			}),
		).rejects.toThrow(/valid email address/i);
	});

	it('rejects submissions with disposable email addresses', async () => {
		await expect(
			submitFeedback({
				name: 'Jane Doe',
				email: 'jane@tempmail.com',
				role: 'GUEST',
				category: 'BUG',
				subject: 'Found a Bug in Store',
				message: 'Here is a detailed explanation of the bug found.',
			}),
		).rejects.toThrow(/Disposable or temporary email/i);
	});

	it('rejects submissions with non-existent domains that have no mail server', async () => {
		await expect(
			submitFeedback({
				name: 'Fake User',
				email: 'fakeuser@nonexistentdomainfake12345abcdefg.org',
				role: 'GUEST',
				category: 'FEATURE_REQUEST',
				subject: 'Feature Request Idea',
				message: 'This should be rejected due to DNS MX record check.',
			}),
		).rejects.toThrow(/does not exist or has no active mail server/i);
	});

	it('accepts and saves valid authentic feedback to the database', async () => {
		const result = await submitFeedback({
			name: 'Developer Reviewer',
			email: 'reviewer@gmail.com',
			role: 'DEVELOPER',
			category: 'DEVELOPER_IMPRESSION',
			rating: 5,
			subject: 'Great Architecture and Code Structure',
			message: 'The Next.js 16 app router setup and Prisma models are well organized.',
			deviceInfo: {
				browser: 'Chrome',
				os: 'Windows',
				screenResolution: '1920x1080',
				path: '/feedback',
			},
		});

		expect(result.success).toBe(true);
		expect(result.ticketCode).toMatch(/^FB-/);

		// Verify record exists in DB
		const record = await db.feedback.findFirst({
			where: { email: 'reviewer@gmail.com', subject: 'Great Architecture and Code Structure' },
		});
		expect(record).not.toBeNull();
		expect(record?.role).toBe('DEVELOPER');
		expect(record?.category).toBe('DEVELOPER_IMPRESSION');
		expect(record?.rating).toBe(5);

		// Clean up test record
		if (record) {
			await db.feedback.delete({ where: { id: record.id } });
		}
	});
});
