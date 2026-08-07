'use server';

import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { CHECKIN_REWARDS, getFormattedDateStrings } from '@/lib/checkin-constants';

export async function getDailyCheckInStatus() {
	const { userId } = await auth();
	const { dateStr, yearMonthStr, daysInMonth } = getFormattedDateStrings();

	if (!userId) {
		return {
			isAuthenticated: false,
			hasClaimedToday: false,
			claimedDaysCount: 0,
			daysInMonth,
			currentMonthStr: yearMonthStr,
			todayDateStr: dateStr,
			checkIns: [],
			nextReward: CHECKIN_REWARDS[1],
		};
	}

	const checkIns = await db.dailyCheckIn.findMany({
		where: {
			userId,
			yearMonth: yearMonthStr,
		},
		orderBy: { createdAt: 'asc' },
	});

	const todayCheckIn = checkIns.find((c) => c.date === dateStr);
	const claimedDaysCount = checkIns.length;
	const nextDayIndex = Math.min(daysInMonth, claimedDaysCount + 1);

	return {
		isAuthenticated: true,
		hasClaimedToday: Boolean(todayCheckIn),
		claimedDaysCount,
		daysInMonth,
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
		throw new Error('Please sign in to claim your daily check in reward.');
	}

	const { dateStr, yearMonthStr, daysInMonth } = getFormattedDateStrings();

	try {
		return await db.$transaction(async (tx) => {
			const checkInsCount = await tx.dailyCheckIn.count({
				where: { userId, yearMonth: yearMonthStr },
			});

			const dayIndex = Math.min(daysInMonth, checkInsCount + 1);
			const rewardSpec = CHECKIN_REWARDS[dayIndex] || CHECKIN_REWARDS[31];

			let couponId: string | null = null;
			let generatedCouponCode: string | null = null;

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
						targetUserId: userId,
					},
				});
				couponId = newCoupon.id;
			}

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

			const account = await tx.loyaltyAccount.upsert({
				where: { userId },
				create: { userId, balance: rewardSpec.coins, lifetimeEarned: rewardSpec.coins },
				update: {
					balance: { increment: rewardSpec.coins },
					lifetimeEarned: { increment: rewardSpec.coins },
				},
			});

			const monthName = new Date().toLocaleString('default', { month: 'short', timeZone: 'UTC' });

			await tx.loyaltyTransaction.create({
				data: {
					accountId: account.id,
					type: 'EARN',
					points: rewardSpec.coins,
					idempotencyKey: `checkin:${userId}:${dateStr}`,
					note: `Daily Check In Reward (${monthName} Day ${dayIndex})`,
				},
			});

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
				? `You earned ${rewardSpec.coins} GoCoins plus a ${rewardSpec.couponDiscount}% Personal Coupon ${generatedCouponCode}`
				: `You earned ${rewardSpec.coins} GoCoins for checking in today Day ${dayIndex}`;

			await tx.notification.create({
				data: {
					sourceEventId: domainEvent.id,
					recipientId: userId,
					category: 'SYSTEM',
					eventType: 'checkin.claimed',
					title: `Day ${dayIndex} Check In Claimed`,
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
			throw new Error('You have already claimed today daily check in reward.');
		}
		throw err;
	}
}
