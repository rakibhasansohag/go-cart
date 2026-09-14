import { beforeEach, describe, expect, it, vi } from 'vitest';
import { upsertReview } from './review';
import type { ReviewDetailsType } from '@/lib/types';

const harness = vi.hoisted(() => ({
	currentUser: vi.fn(),
	db: {
		review: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
			upsert: vi.fn(),
		},
		orderItem: {
			findFirst: vi.fn(),
		},
		product: {
			update: vi.fn(),
		},
	},
	getRatingStatistics: vi.fn(),
	enforceSharedRateLimit: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({
	currentUser: harness.currentUser,
}));

vi.mock('@/lib/db', () => ({
	db: harness.db,
}));

vi.mock('./product', () => ({
	getRatingStatistics: harness.getRatingStatistics,
}));

vi.mock('@/lib/security/rate-limit', () => ({
	enforceSharedRateLimit: harness.enforceSharedRateLimit,
}));

const baseReview: ReviewDetailsType = {
	id: 'rev-1',
	rating: 5,
	review: 'Great item',
	variant: 'default',
	images: [],
	size: 'M',
	quantity: '1',
	variantImage: 'https://res.cloudinary.com/gocart/img.jpg',
	color: 'Black',
};

describe('upsertReview query', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		harness.currentUser.mockResolvedValue({ id: 'user-1' });
		harness.enforceSharedRateLimit.mockResolvedValue({ allowed: true, remaining: 4, retryAfterSeconds: 0 });
		harness.db.review.findFirst.mockResolvedValue(null);
		harness.db.orderItem.findFirst.mockResolvedValue(null);
		harness.db.review.findMany.mockResolvedValue([{ rating: 5 }]);
		harness.getRatingStatistics.mockResolvedValue({ total: 1, average: 5 });
		harness.db.product.update.mockResolvedValue({});
		harness.db.review.upsert.mockResolvedValue({
			...baseReview,
			productId: 'prod-1',
			userId: 'user-1',
			votes: [],
			reply: null,
		});
	});

	it('throws an error if user is unauthenticated', async () => {
		harness.currentUser.mockResolvedValue(null);
		await expect(
			upsertReview('prod-1', {
				...baseReview,
				review: 'test',
			}),
		).rejects.toThrow('Unauthenticated.');
	});

	it('enforces shared rate limiting per user', async () => {
		harness.enforceSharedRateLimit.mockRejectedValueOnce(new Error('Rate limit exceeded.'));
		await expect(
			upsertReview('prod-1', {
				...baseReview,
				review: 'test',
			}),
		).rejects.toThrow('Rate limit exceeded.');

		expect(harness.enforceSharedRateLimit).toHaveBeenCalledWith({
			key: 'review:upsert:user-1',
			limit: 5,
			windowMs: 10 * 60 * 1000,
		});
	});

	it('sanitizes malicious script tags from review content', async () => {
		await upsertReview('prod-1', {
			...baseReview,
			review: '<script>alert("hacked")</script>Solid quality product!',
		});

		expect(harness.db.review.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({
					review: 'Solid quality product!',
				}),
			}),
		);
	});

	it('rejects unauthorized or insecure media URLs', async () => {
		await expect(
			upsertReview('prod-1', {
				...baseReview,
				review: 'Review with malicious image',
				images: [{ url: 'http://malicious.site/exploit.svg' }],
			}),
		).rejects.toThrow();
	});

	it('accepts valid Cloudinary media URLs and completes review creation', async () => {
		const validUrl = 'https://res.cloudinary.com/gocart/image/upload/v1/pic.jpg';
		const result = await upsertReview('prod-1', {
			...baseReview,
			review: 'Authentic review',
			images: [{ url: validUrl }],
		});

		expect(result.review.id).toBe('rev-1');
		expect(harness.db.review.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({
					review: 'Authentic review',
					images: {
						create: [{ url: validUrl }],
					},
				}),
			}),
		);
	});
});
