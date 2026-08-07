'use server';

import { db } from '@/lib/db';
import { awardCoins } from '@/lib/loyalty/coins';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';

export interface MilestoneReward {
	day: number;
	coins: number;
	couponDiscount?: number; // e.g. 10 for 10%
	couponCodePrefix?: string;
	title: string;
	description: string;
}

// 31-day reward schedule definition
export const CHECKIN_REWARDS: Record<number, MilestoneReward> = {
	1: { day: 1, coins: 20, title: 'Day 1 Starter', description: '20 GoCoins' },
	2: { day: 2, coins: 30, title: 'Day 2 Streak', description: '30 GoCoins' },
	3: { day: 3, coins: 40, title: 'Day 3 Bonus', description: '40 GoCoins' },
	4: { day: 4, coins: 40, title: 'Day 4 Streak', description: '40 GoCoins' },
	5: { day: 5, coins: 50, title: 'Day 5 Power', description: '50 GoCoins' },
	6: { day: 6, coins: 50, title: 'Day 6 Surge', description: '50 GoCoins' },
	7: {
		day: 7,
		coins: 100,
		couponDiscount: 10,
		couponCodePrefix: 'STREAK7',
		title: 'Day 7 Milestone',
		description: '100 GoCoins + 10% Personal Coupon',
	},
	8: { day: 8, coins: 30, title: 'Day 8 Streak', description: '30 GoCoins' },
	9: { day: 9, coins: 40, title: 'Day 9 Streak', description: '40 GoCoins' },
	10: { day: 10, coins: 50, title: 'Day 10 Bonus', description: '50 GoCoins' },
	11: { day: 11, coins: 50, title: 'Day 11 Streak', description: '50 GoCoins' },
	12: { day: 12, coins: 60, title: 'Day 12 Boost', description: '60 GoCoins' },
	13: { day: 13, coins: 60, title: 'Day 13 Surge', description: '60 GoCoins' },
	14: {
		day: 14,
		coins: 200,
		couponDiscount: 12,
		couponCodePrefix: 'STREAK14',
		title: 'Day 14 Milestone',
		description: '200 GoCoins + 12% Perk Coupon',
	},
	15: { day: 15, coins: 40, title: 'Day 15 Midpoint', description: '40 GoCoins' },
	16: { day: 16, coins: 50, title: 'Day 16 Streak', description: '50 GoCoins' },
	17: { day: 17, coins: 50, title: 'Day 17 Streak', description: '50 GoCoins' },
	18: { day: 18, coins: 60, title: 'Day 18 Bonus', description: '60 GoCoins' },
	19: { day: 19, coins: 60, title: 'Day 19 Surge', description: '60 GoCoins' },
	20: { day: 20, coins: 70, title: 'Day 20 Power', description: '70 GoCoins' },
	21: {
		day: 21,
		coins: 300,
		couponDiscount: 15,
		couponCodePrefix: 'STREAK21',
		title: 'Day 21 Milestone',
		description: '300 GoCoins + 15% VIP Coupon',
	},
	22: { day: 22, coins: 50, title: 'Day 22 Streak', description: '50 GoCoins' },
	23: { day: 23, coins: 60, title: 'Day 23 Bonus', description: '60 GoCoins' },
	24: { day: 24, coins: 70, title: 'Day 24 Streak', description: '70 GoCoins' },
	25: { day: 25, coins: 80, title: 'Day 25 Surge', description: '80 GoCoins' },
	26: { day: 26, coins: 80, title: 'Day 26 Power', description: '80 GoCoins' },
	27: { day: 27, coins: 90, title: 'Day 27 Ultra', description: '90 GoCoins' },
	28: {
		day: 28,
		coins: 500,
		couponDiscount: 20,
		couponCodePrefix: 'STREAK28',
		title: 'Day 28 Jackpot',
		description: '500 GoCoins + 20% Super Coupon',
	},
	29: { day: 29, coins: 100, title: 'Day 29 Master', description: '100 GoCoins' },
	30: { day: 30, coins: 100, title: 'Day 30 Legend', description: '100 GoCoins' },
	31: { day: 31, coins: 100, title: 'Day 31 Champion', description: '100 GoCoins' },
};

function getFormattedDateStrings(d = new Date()) {
	const year = d.getUTCFullYear();
	const month = String(d.getUTCMonth() + 1).padStart(2, '0');
	const day = String(d.getUTCDate()).padStart(2, '0');
	return {
		dateStr: `${year}-${month}-${day}`,
		yearMonthStr: `${year}-${month}`,
	};
}

export async function getDailyCheckInStatus() {
	const { userId } = await auth();
	if (!userId) {
		return {
			isAuthenticated: false,
			hasClaimedToday: false,
			claimedDaysCount: 0,
			currentMonthStr: getFormattedDateStrings().yearMonthStr,
			todayDateStr: getFormattedDateStrings().dateStr,
			checkIns: [],
			nextReward: CHECKIN_REWARDS[1],
		};
	}

	const { dateStr, yearMonthStr } = getFormattedDateStrings();

	const checkIns = await db.dailyCheckIn.findMany({
		where: {
			userId,
			yearMonth: yearMonthStr,
		},
		orderBy: { createdAt: 'asc' },
	});

	const todayCheckIn = checkIns.find((c) => c.date === dateStr);
	const claimedDaysCount = checkIns.length;
	const nextDayIndex = Math.min(31, claimedDaysCount + 1);

	return {
		isAuthenticated: true,
		hasClaimedToday: Boolean(todayCheckIn),
		claimedDaysCount,
		currentMonthStr: yearMonthStr,
		todayDateStr: dateStr,
		checkIns: checkIns.map((c) => ({
			id: c.id,
			date: c.date,
			dayIndex: c.dayIndex,
			coinsEarned: c.coinsEarned,
			rewardType: c.rewardType,
			couponId: c.couponId,
		})),
		nextReward: CHECKIN_REWARDS[nextDayIndex] || CHECKIN_REWARDS[31],
	};
}

export async function claimDailyCheckIn() {
	const { userId } = await auth();
	if (!userId) {
		throw new Error('Please sign in to claim your daily check-in reward.');
	}

	const { dateStr, yearMonthStr } = getFormattedDateStrings();

	try {
		return await db.$transaction(async (tx) => {
			// 1. Fetch user check-ins for the current month
			const checkInsCount = await tx.dailyCheckIn.count({
				where: { userId, yearMonth: yearMonthStr },
			});

			const dayIndex = Math.min(31, checkInsCount + 1);
			const rewardSpec = CHECKIN_REWARDS[dayIndex] || CHECKIN_REWARDS[31];

			let couponId: string | null = null;
			let generatedCouponCode: string | null = null;

			// 2. Generate Personal Coupon if Milestone Reward
			if (rewardSpec.couponDiscount && rewardSpec.couponCodePrefix) {
				const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
				generatedCouponCode = `${rewardSpec.couponCodePrefix}-${userId.slice(-4).toUpperCase()}-${randomSuffix}`;

				const now = new Date();
				const startDate = now.toISOString().split('T')[0];
				const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

				const newCoupon = await tx.coupon.create({
					data: {
						code: generatedCouponCode,
						discount: rewardSpec.couponDiscount,
						startDate,
						endDate,
						maxUses: 1,
						maxUsesPerUser: 1,
						targetUserId: userId, // BIND TO USER STRICTLY
					},
				});
				couponId = newCoupon.id;
			}

			// 3. Atomically create DailyCheckIn record
			const checkInRecord = await tx.dailyCheckIn.create({
				data: {
					userId,
					date: dateStr,
					yearMonth: yearMonthStr,
					dayIndex,
					coinsEarned: rewardSpec.coins,
					rewardType: couponId ? 'COINS_COUPON' : 'COINS',
					couponId,
				},
			});

			// 4. Award GoCoins to LoyaltyAccount
			const account = await tx.loyaltyAccount.upsert({
				where: { userId },
				create: { userId, balance: rewardSpec.coins, lifetimeEarned: rewardSpec.coins },
				update: {
					balance: { increment: rewardSpec.coins },
					lifetimeEarned: { increment: rewardSpec.coins },
				},
			});

			await tx.loyaltyTransaction.create({
				data: {
					accountId: account.id,
					type: 'EARN',
					points: rewardSpec.coins,
					idempotencyKey: `checkin:${userId}:${dateStr}`,
					note: `Daily Check-In Reward (Day ${dayIndex})`,
				},
			});

			// 5. In-App Notification
			const domainEvent = await tx.domainEvent.create({
				data: {
					eventKey: `checkin.claimed:${userId}:${dateStr}`,
					eventType: 'checkin.claimed',
					aggregateType: 'DAILY_CHECKIN',
					aggregateId: checkInRecord.id,
					actorUserId: userId,
					payload: {
						dayIndex,
						coinsEarned: rewardSpec.coins,
						couponCode: generatedCouponCode,
					},
				},
			});

			const notifMessage = generatedCouponCode
				? `You earned ${rewardSpec.coins} GoCoins + a ${rewardSpec.couponDiscount}% Personal Coupon (${generatedCouponCode})!`
				: `You earned ${rewardSpec.coins} GoCoins for checking in today (Day ${dayIndex})!`;

			await tx.notification.create({
				data: {
					sourceEventId: domainEvent.id,
					recipientId: userId,
					category: 'SYSTEM',
					eventType: 'checkin.claimed',
					title: `Day ${dayIndex} Check-In Claimed!`,
					message: notifMessage,
					actionUrl: '/profile/rewards',
				},
			});

			return {
				success: true,
				dayIndex,
				coinsEarned: rewardSpec.coins,
				couponCode: generatedCouponCode,
				couponDiscount: rewardSpec.couponDiscount,
				rewardTitle: rewardSpec.title,
				newBalance: account.balance,
			};
		});
	} catch (err) {
		if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
			throw new Error("You have already claimed today's daily check-in reward!");
		}
		throw err;
	}
}
