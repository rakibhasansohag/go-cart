'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHECKIN_REWARDS } from '@/lib/checkin-constants';
import { claimDailyCheckIn } from '@/queries/checkin';
import { Check, Gift, Coins, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getFriendlyErrorMessage } from '@/lib/utils';
import { Button } from '@/components/store/ui/button';

interface CheckInRecord {
	id: string;
	date: string;
	dayIndex: number;
	coinsEarned: number;
	rewardType: string;
	couponId?: string | null;
}

interface Props {
	hasClaimedToday: boolean;
	claimedDaysCount: number;
	daysInMonth?: number;
	todayDateStr: string;
	checkIns: CheckInRecord[];
	onClaimSuccess?: (data: { coinsEarned: number; rewardTitle: string; couponCode?: string | null }) => void;
}

export default function CheckInCalendar({
	hasClaimedToday,
	claimedDaysCount,
	daysInMonth = 31,
	todayDateStr,
	checkIns,
	onClaimSuccess,
}: Props) {
	const [loading, setLoading] = useState(false);
	const [claimedState, setClaimedState] = useState(hasClaimedToday);
	const [countState, setCountState] = useState(claimedDaysCount);
	const [claimedRecords, setClaimedRecords] = useState<CheckInRecord[]>(checkIns);

	// Today's claimable day index is current claimed count + 1 (if not claimed today)
	const todayDayIndex = claimedState ? countState : Math.min(daysInMonth, countState + 1);

	const handleClaim = async () => {
		if (loading || claimedState) return;
		setLoading(true);

		try {
			const res = await claimDailyCheckIn();
			setClaimedState(true);
			setCountState((prev) => prev + 1);
			setClaimedRecords((prev) => [
				...prev,
				{
					id: Date.now().toString(),
					date: todayDateStr,
					dayIndex: res.dayIndex,
					coinsEarned: res.coinsEarned,
					rewardType: res.couponCode ? 'COINS_COUPON' : 'COINS',
				},
			]);

			toast.success(
				res.couponCode
					? `Claimed! +${res.coinsEarned} GoCoins & Coupon ${res.couponCode}`
					: `Claimed! +${res.coinsEarned} GoCoins added to balance!`,
			);

			onClaimSuccess?.(res);
		} catch (error) {
			toast.error(getFriendlyErrorMessage(error));
		} finally {
			setLoading(false);
		}
	};

	// Generate dynamic days array matching active month (28, 29, 30, or 31)
	const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

	return (
		<div className='w-full bg-background/95 backdrop-blur-xl border border-border/20 rounded-3xl p-6 shadow-2xl space-y-6'>
			{/* Header Header */}
			<div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/10 pb-4'>
				<div>
					<div className='flex items-center gap-x-2'>
						<Sparkles className='w-5 h-5 text-amber-500 animate-pulse' />
						<h2 className='text-xl font-bold text-main-primary'>Monthly Check-In Rewards</h2>
					</div>
					<p className='text-xs text-muted-foreground mt-1'>
						Check in daily to earn GoCoins and unlock exclusive personal coupons!
					</p>
				</div>
				<div className='flex items-center gap-x-2 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20'>
					<Coins className='w-4 h-4 text-amber-500' />
					<span className='text-xs font-semibold text-amber-600 dark:text-amber-400'>
						{countState} / {daysInMonth} Days Checked In
					</span>
				</div>
			</div>

			{/* Calendar Grid */}
			<div className='grid grid-cols-4 sm:grid-cols-7 gap-2.5 sm:gap-3'>
				{daysArray.map((dayNum) => {
					const isClaimed = claimedRecords.some((c) => c.dayIndex === dayNum);
					const isToday = !claimedState && dayNum === todayDayIndex;
					const reward = CHECKIN_REWARDS[dayNum] || CHECKIN_REWARDS[31];
					const isMilestone = Boolean(reward.couponDiscount);

					return (
						<motion.div
							key={dayNum}
							whileHover={{ scale: 1.04 }}
							whileTap={{ scale: 0.98 }}
							className={cn(
								'relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 min-h-[78px]',
								{
									// Claimed state
									'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400': isClaimed,
									// Today claimable state
									'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/40 animate-pulse':
										isToday,
									// Milestone upcoming state
									'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400':
										!isClaimed && !isToday && isMilestone,
									// Normal upcoming state
									'bg-muted/30 border-border/10 text-muted-foreground hover:bg-muted/50':
										!isClaimed && !isToday && !isMilestone,
								},
							)}
						>
							{/* Day Header */}
							<div className='w-full flex items-center justify-between text-[11px] font-bold'>
								<span>Day {dayNum}</span>
								{isClaimed ? (
									<div className='w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center'>
										<Check className='w-3 h-3 stroke-[3]' />
									</div>
								) : isMilestone ? (
									<Gift className='w-3.5 h-3.5 text-purple-500 animate-bounce' />
								) : null}
							</div>

							{/* Reward Content */}
							<div className='my-1 text-center'>
								<div className='flex items-center justify-center gap-x-1 text-xs font-bold'>
									<Coins className='w-3.5 h-3.5 text-amber-500' />
									<span>+{reward.coins}</span>
								</div>
								{reward.couponDiscount && (
									<span className='text-[10px] font-semibold text-purple-500 block leading-tight mt-0.5'>
										{reward.couponDiscount}% OFF
									</span>
								)}
							</div>

							{/* Status Tag */}
							<div className='text-[9px] font-semibold tracking-tight'>
								{isClaimed ? (
									<span className='text-emerald-600 dark:text-emerald-400'>Claimed</span>
								) : isToday ? (
									<span className='text-amber-600 font-bold dark:text-amber-300'>Today</span>
								) : (
									<span className='opacity-60'>Day {dayNum}</span>
								)}
							</div>
						</motion.div>
					);
				})}
			</div>

			{/* Bottom Action Footer */}
			<div className='pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/10'>
				<div className='text-xs text-muted-foreground flex items-center gap-x-1.5'>
					<AlertCircle className='w-4 h-4 text-amber-500 shrink-0' />
					<span>Progress does not reset when you skip a day. Every check-in counts!</span>
				</div>

				<Button
					onClick={handleClaim}
					disabled={loading || claimedState}
					variant='orange-gradient'
					className={cn('h-11 px-8 rounded-full font-bold text-sm shadow-xl transition-all', {
						'opacity-60 cursor-not-allowed bg-emerald-600 hover:bg-emerald-600': claimedState,
					})}
				>
					{loading ? (
						<div className='flex items-center gap-x-2'>
							<Loader2 className='w-4 h-4 animate-spin' />
							<span>Claiming…</span>
						</div>
					) : claimedState ? (
						<div className='flex items-center gap-x-1.5 text-white'>
							<Check className='w-4 h-4' />
							<span>Today’s Reward Claimed</span>
						</div>
					) : (
						<div className='flex items-center gap-x-1.5 text-white'>
							<Sparkles className='w-4 h-4' />
							<span>Claim Day {todayDayIndex} Reward</span>
						</div>
					)}
				</Button>
			</div>
		</div>
	);
}
