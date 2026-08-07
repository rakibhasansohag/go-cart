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

			{/* Mobile View: Smooth Horizontal Swipe Carousel (only 1 row high!) */}
			<div className='sm:hidden flex overflow-x-auto gap-2 py-2 px-1 snap-x scrollbar-none -mx-1'>
				{daysArray.map((dayNum) => {
					const isClaimed = claimedRecords.some((c) => c.dayIndex === dayNum);
					const isToday = !claimedState && dayNum === todayDayIndex;
					const reward = CHECKIN_REWARDS[dayNum] || CHECKIN_REWARDS[31];
					const isMilestone = Boolean(reward.couponDiscount);

					return (
						<motion.div
							key={dayNum}
							whileTap={{ scale: 0.95 }}
							className={cn(
								'w-[76px] shrink-0 snap-start flex flex-col items-center justify-between p-2 rounded-2xl border transition-all duration-300 min-h-[90px]',
								{
									// Claimed state
									'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400': isClaimed,
									// Today claimable state
									'bg-gradient-to-br from-amber-500/25 to-orange-500/25 border-orange-500 shadow-md shadow-orange-500/20 ring-2 ring-orange-500/50 animate-pulse':
										isToday,
									// Milestone upcoming state
									'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-500/40 text-amber-700 dark:text-amber-300':
										!isClaimed && !isToday && isMilestone,
									// Normal upcoming state
									'bg-muted/30 border-border/10 text-muted-foreground hover:bg-muted/50':
										!isClaimed && !isToday && !isMilestone,
								},
							)}
						>
							<div className='w-full flex items-center justify-between text-[11px] font-extrabold'>
								<span className={cn({ 'text-orange-600 dark:text-orange-400 font-black': isToday })}>
									Day {dayNum}
								</span>
								{isClaimed ? (
									<div className='w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm'>
										<Check className='w-2.5 h-2.5 stroke-[3]' />
									</div>
								) : isMilestone ? (
									<Gift className='w-3.5 h-3.5 text-amber-500 animate-bounce' />
								) : null}
							</div>

							<div className='my-0.5 text-center flex flex-col items-center justify-center gap-y-0.5'>
								<div className='flex items-center justify-center gap-x-1 text-sm font-black text-main-primary'>
									<Coins className='w-3.5 h-3.5 text-amber-500 shrink-0' />
									<span>+{reward.coins}</span>
								</div>
								{reward.couponDiscount && (
									<span className='text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1 py-0.2 rounded-full border border-amber-500/30 block leading-tight'>
										{reward.couponDiscount}% OFF
									</span>
								)}
							</div>

							<div className='text-[9px] font-bold tracking-tight min-h-[12px] flex items-center'>
								{isClaimed ? (
									<span className='text-emerald-600 dark:text-emerald-400 font-extrabold'>Claimed</span>
								) : isToday ? (
									<span className='text-orange-600 dark:text-orange-300 font-black uppercase tracking-wider animate-pulse'>
										Today
									</span>
								) : isMilestone ? (
									<span className='text-amber-700 dark:text-amber-300 font-bold'>Perk</span>
								) : null}
							</div>
						</motion.div>
					);
				})}
			</div>

			{/* Desktop & Tablet View: Adaptable Grid (4 cols on tablet, 7 cols on laptop) */}
			<div className='hidden sm:grid sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-3'>
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
								'relative flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-2xl border transition-all duration-300 min-h-[84px] sm:min-h-[90px]',
								{
									// Claimed state
									'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400': isClaimed,
									// Today claimable state
									'bg-gradient-to-br from-amber-500/25 to-orange-500/25 border-orange-500 shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/50 animate-pulse':
										isToday,
									// Milestone upcoming state
									'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-500/40 text-amber-700 dark:text-amber-300':
										!isClaimed && !isToday && isMilestone,
									// Normal upcoming state
									'bg-muted/30 border-border/10 text-muted-foreground hover:bg-muted/50':
										!isClaimed && !isToday && !isMilestone,
								},
							)}
						>
							<div className='w-full flex items-center justify-between text-xs font-extrabold'>
								<span className={cn({ 'text-orange-600 dark:text-orange-400 font-black': isToday })}>
									Day {dayNum}
								</span>
								{isClaimed ? (
									<div className='w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm'>
										<Check className='w-3 h-3 stroke-[3]' />
									</div>
								) : isMilestone ? (
									<Gift className='w-4 h-4 text-amber-500 animate-bounce' />
								) : null}
							</div>

							<div className='my-0.5 text-center flex flex-col items-center justify-center gap-y-0.5'>
								<div className='flex items-center justify-center gap-x-1 text-sm sm:text-base font-black text-main-primary'>
									<Coins className='w-4 h-4 text-amber-500 shrink-0' />
									<span>+{reward.coins}</span>
								</div>
								{reward.couponDiscount && (
									<span className='text-[10px] sm:text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded-full border border-amber-500/30 block leading-tight'>
										{reward.couponDiscount}% OFF
									</span>
								)}
							</div>

							<div className='text-[10px] font-bold tracking-tight min-h-[14px] flex items-center'>
								{isClaimed ? (
									<span className='text-emerald-600 dark:text-emerald-400 font-extrabold'>Claimed</span>
								) : isToday ? (
									<span className='text-orange-600 dark:text-orange-300 font-black uppercase tracking-wider animate-pulse'>
										Today
									</span>
								) : isMilestone ? (
									<span className='text-amber-700 dark:text-amber-300 font-bold'>Special Perk</span>
								) : null}
							</div>
						</motion.div>
					);
				})}
			</div>

			{/* Bottom Action Footer */}
			<div className='pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/10'>
				<div className='text-xs sm:text-sm text-muted-foreground flex items-center gap-x-2 shrink'>
					<AlertCircle className='w-4 h-4 text-amber-500 shrink-0' />
					<span>Progress does not reset when you skip a day. Every check-in counts!</span>
				</div>

				<Button
					onClick={handleClaim}
					disabled={loading || claimedState}
					variant='orange-gradient'
					className={cn('h-10 px-6 sm:px-8 rounded-full font-black text-xs sm:text-sm shadow-md transition-all shrink-0 w-full sm:w-auto', {
						'opacity-70 cursor-not-allowed bg-emerald-600 hover:bg-emerald-600': claimedState,
					})}
				>
					{loading ? (
						<div className='flex items-center gap-x-2'>
							<Loader2 className='w-4 h-4 animate-spin' />
							<span>Claiming...</span>
						</div>
					) : claimedState ? (
						<div className='flex items-center gap-x-1.5 text-white'>
							<Check className='w-4 h-4 stroke-[3]' />
							<span>Today&apos;s Reward Claimed</span>
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
