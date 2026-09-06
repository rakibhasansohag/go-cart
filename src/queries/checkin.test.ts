import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const {
	dbMock,
	authMock,
	requireAuthenticatedUserMock,
	enforceSharedRateLimitMock,
	publishDomainEventMock,
} = vi.hoisted(() => ({
	dbMock: {
		$transaction: vi.fn(),
		user: { findUnique: vi.fn() },
		dailyCheckIn: { findMany: vi.fn(), count: vi.fn() },
	},
	authMock: vi.fn(),
	requireAuthenticatedUserMock: vi.fn(),
	enforceSharedRateLimitMock: vi.fn(),
	publishDomainEventMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }));
vi.mock('@/lib/security/request-guards', () => ({ requireAuthenticatedUser: requireAuthenticatedUserMock }));
vi.mock('@/lib/security/rate-limit', () => ({ enforceSharedRateLimit: enforceSharedRateLimitMock }));
vi.mock('@/lib/notifications/domain-events', () => ({
	DOMAIN_EVENT_TYPES: {
		CHECKIN_CLAIMED: 'checkin.claimed',
	},
	publishDomainEvent: publishDomainEventMock,
}));

import { getDailyCheckInStatus, claimDailyCheckIn } from './checkin';

describe('Daily Check-In Service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns unauthenticated state when user is not logged in', async () => {
		authMock.mockResolvedValue({ userId: null });

		const status = await getDailyCheckInStatus();
		expect(status.isAuthenticated).toBe(false);
		expect(status.isEligible).toBe(false);
		expect(status.hasClaimedToday).toBe(false);
	});

	it('returns ineligible state when user is suspended', async () => {
		authMock.mockResolvedValue({ userId: 'user-suspended' });
		dbMock.user.findUnique.mockResolvedValue({ accountStatus: 'SUSPENDED' });

		const status = await getDailyCheckInStatus();
		expect(status.isAuthenticated).toBe(true);
		expect(status.isEligible).toBe(false);
	});

	it('claims check-in reward and generates cryptographic coupon on milestone days', async () => {
		requireAuthenticatedUserMock.mockResolvedValue({ id: 'user-milestone-1234' });
		enforceSharedRateLimitMock.mockResolvedValue(undefined);

		const createdCoupon: { code: string; discount: number; targetUserId: string }[] = [];
		const txMock = {
			dailyCheckIn: {
				count: vi.fn().mockResolvedValue(6), // 6 previous check-ins -> dayIndex 7 (milestone day!)
				create: vi.fn().mockResolvedValue({ id: 'checkin-rec-1' }),
			},
			coupon: {
				create: vi.fn().mockImplementation(async ({ data }: { data: { code: string; discount: number; targetUserId: string } }) => {
					createdCoupon.push(data);
					return { id: 'coupon-1', ...data };
				}),
			},
			loyaltyAccount: {
				upsert: vi.fn().mockResolvedValue({ balance: 100, lifetimeEarned: 100 }),
			},
			loyaltyTransaction: {
				create: vi.fn().mockResolvedValue({ id: 'tx-checkin-1' }),
			},
		};

		dbMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => unknown) => callback(txMock));

		const result = await claimDailyCheckIn();

		expect(result.success).toBe(true);
		expect(result.dayIndex).toBe(7);
		expect(result.coinsEarned).toBe(100);
		expect(result.couponDiscount).toBe(10);
		expect(result.couponCode).toMatch(/^STREAK7-1234-[A-F0-9]{6}$/); // Hex suffix from randomBytes
		expect(publishDomainEventMock).toHaveBeenCalledWith(txMock, expect.objectContaining({
			eventType: 'checkin.claimed',
			actorUserId: 'user-milestone-1234',
		}));
	});

	it('throws expected friendly error on duplicate claim (P2002 conflict)', async () => {
		requireAuthenticatedUserMock.mockResolvedValue({ id: 'user-dup' });
		enforceSharedRateLimitMock.mockResolvedValue(undefined);

		const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
			code: 'P2002',
			clientVersion: '5.0.0',
		});

		dbMock.$transaction.mockRejectedValue(p2002Error);

		await expect(claimDailyCheckIn()).rejects.toThrow('You have already claimed today daily check in reward.');
	});
});
