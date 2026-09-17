'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHECKIN_REWARDS } from '@/lib/checkin-constants';
import { claimDailyCheckIn } from '@/queries/checkin';
import { Check, Gift, Coins, Sparkles, AlertCircle, Loader2, Star, Lock, Zap } from 'lucide-react';
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
	onClose?: () => void;
}

const MILESTONE_DAYS = [7, 14, 21, 28];

export default function CheckInCalendar({
	hasClaimedToday,
	claimedDaysCount,
	daysInMonth = 31,
	todayDateStr,
	checkIns,
	onClaimSuccess,
	onClose,
}: Props) {
	const [loading, setLoading] = useState(false);
	const [claimedState, setClaimedState] = useState(hasClaimedToday);
	const [countState, setCountState] = useState(claimedDaysCount);
	const [claimedRecords, setClaimedRecords] = useState<CheckInRecord[]>(checkIns);
	const [justClaimed, setJustClaimed] = useState(false);

	React.useEffect(() => {
		setClaimedState(hasClaimedToday);
		setCountState(claimedDaysCount);
		setClaimedRecords(checkIns);
	}, [hasClaimedToday, claimedDaysCount, checkIns]);

	const todayDayIndex = claimedState ? countState : Math.min(daysInMonth, countState + 1);

	const handleClaim = async () => {
		if (loading || claimedState) return;
		setLoading(true);

		try {
			const res = await claimDailyCheckIn();
			setClaimedState(true);
			setCountState((prev) => prev + 1);
			setJustClaimed(true);
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

	const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
	const progressPercent = Math.round((countState / daysInMonth) * 100);

	return (
		<div className='w-full space-y-5'>
			{/* Progress Bar Section */}
			<div className='space-y-2'>
				<div className='flex items-center justify-between text-xs'>
					<span className='text-muted-foreground font-medium'>Monthly Progress</span>
					<span className='font-bold text-main-primary'>
						{countState}/{daysInMonth} days &mdash; {progressPercent}%
					</span>
				</div>
				<div className='relative h-2.5 w-full overflow-hidden rounded-full bg-muted/40'>
					<motion.div
						className='h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500'
						initial={{ width: 0 }}
						animate={{ width: `${progressPercent}%` }}
						transition={{ duration: 0.8, ease: 'easeOut' }}
					/>
					{/* Milestone markers on the bar */}
					{MILESTONE_DAYS.filter((d) => d <= daysInMonth).map((d) => (
						<div
							key={d}
							className='absolute top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-amber-300/70'
							style={{ left: `${(d / daysInMonth) * 100}%`, transform: 'translate(-50%, -50%)' }}
						/>
					))}
				</div>
				{/* Milestone labels */}
				<div className='relative h-4'>
					{MILESTONE_DAYS.filter((d) => d <= daysInMonth).map((d) => (
						<span
							key={d}
							className='absolute text-[10px] font-bold text-amber-600 dark:text-amber-400 -translate-x-1/2'
							style={{ left: `${(d / daysInMonth) * 100}%` }}
						>
							Day {d}
						</span>
					))}
				</div>
			</div>

			{/* Day Cards Grid */}
			<div className='grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2'>
				{daysArray.map((dayNum) => {
					const isClaimed = claimedRecords.some((c) => c.dayIndex === dayNum);
					const isToday = !claimedState && dayNum === todayDayIndex;
					const isFuture = dayNum > todayDayIndex;
					const reward = CHECKIN_REWARDS[dayNum] || CHECKIN_REWARDS[31];
					const isMilestone = Boolean(reward.couponDiscount);
					const isJustClaimedDay = justClaimed && isClaimed && dayNum === countState;

					return (
						<motion.div
							key={dayNum}
							initial={isJustClaimedDay ? { scale: 1.2, opacity: 0 } : false}
							animate={isJustClaimedDay ? { scale: 1, opacity: 1 } : {}}
							whileHover={!isFuture && !isClaimed ? { scale: 1.06, y: -2 } : {}}
							whileTap={isToday ? { scale: 0.95 } : {}}
							transition={{ type: 'spring', stiffness: 300, damping: 20 }}
							className={cn(
								'relative flex flex-col items-center justify-between rounded-xl border p-1.5 sm:p-2 transition-colors duration-200 overflow-hidden',
								'min-h-[72px] sm:min-h-[82px]',
								{
									// Claimed — clean green
									'bg-emerald-500/10 border-emerald-400/40': isClaimed,
									// Today — vivid highlight
									'border-orange-500 shadow-[0_0_12px_2px_rgba(249,115,22,0.35)] bg-gradient-to-b from-orange-500/20 to-amber-500/10':
										isToday,
									// Milestone upcoming
									'bg-gradient-to-b from-amber-500/15 to-transparent border-amber-500/50':
										!isClaimed && !isToday && isMilestone,
									// Future normal
									'bg-muted/20 border-border/10 opacity-60': isFuture && !isMilestone,
									// Past normal
									'bg-muted/30 border-border/15': !isClaimed && !isToday && !isFuture && !isMilestone,
								},
							)}
						>
							{/* Milestone shimmer overlay */}
							{isMilestone && !isClaimed && (
								<div className='absolute inset-0 pointer-events-none overflow-hidden rounded-xl'>
									<div className='absolute -inset-1 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-[shimmer_2s_infinite]' />
								</div>
							)}

							{/* Top row: day label + status icon */}
							<div className='w-full flex items-center justify-between'>
								<span
									className={cn('text-[10px] sm:text-xs font-bold leading-none', {
										'text-orange-500 dark:text-orange-400': isToday,
										'text-emerald-600 dark:text-emerald-400': isClaimed,
										'text-amber-600 dark:text-amber-400': !isClaimed && !isToday && isMilestone,
										'text-muted-foreground/60': isFuture && !isMilestone,
										'text-muted-foreground': !isClaimed && !isToday && !isFuture,
									})}
								>
									{dayNum}
								</span>
								<span className='shrink-0'>
									{isClaimed ? (
										<span className='flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40'>
											<Check className='w-2.5 h-2.5 text-white stroke-[3]' />
										</span>
									) : isToday ? (
										<Zap className='w-3.5 h-3.5 text-orange-500 animate-pulse' />
									) : isMilestone ? (
										<Star className='w-3 h-3 text-amber-500 fill-amber-500/30' />
									) : isFuture ? (
										<Lock className='w-2.5 h-2.5 text-muted-foreground/40' />
									) : null}
								</span>
							</div>

							{/* Center: coin amount */}
							<div className='flex flex-col items-center gap-y-0.5 my-0.5'>
								<div
									className={cn('flex items-center gap-x-0.5 font-black', {
										'text-sm sm:text-base': isMilestone,
										'text-xs sm:text-sm': !isMilestone,
										'text-orange-500': isToday,
										'text-emerald-600 dark:text-emerald-400': isClaimed,
										'text-amber-600 dark:text-amber-500': !isClaimed && !isToday && isMilestone,
										'text-muted-foreground/70': isFuture && !isMilestone,
										'text-main-primary': !isClaimed && !isToday && !isFuture,
									})}
								>
									<Coins
										className={cn('shrink-0', {
											'w-3.5 h-3.5 text-amber-500': isMilestone,
											'w-3 h-3 text-amber-400': !isMilestone,
										})}
									/>
									<span>+{reward.coins}</span>
								</div>

								{reward.couponDiscount && (
									<AnimatePresence>
										<motion.span
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ opacity: 1, scale: 1 }}
											className={cn(
												'text-[9px] sm:text-[10px] font-black px-1 py-px rounded-full border leading-tight',
												isClaimed
													? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'
													: 'text-amber-700 dark:text-amber-300 border-amber-500/40 bg-amber-500/15',
											)}
										>
											{reward.couponDiscount}% OFF
										</motion.span>
									</AnimatePresence>
								)}
							</div>

							{/* Bottom: state label */}
							<div className='text-[9px] sm:text-[10px] font-bold text-center leading-none min-h-[10px]'>
								{isClaimed ? (
									<span className='text-emerald-500'>✓ Done</span>
								) : isToday ? (
									<span className='text-orange-500 uppercase tracking-wider font-black'>Today!</span>
								) : isMilestone ? (
									<span className='text-amber-600 dark:text-amber-400'>
										<Gift className='inline w-2.5 h-2.5 mr-px' />
										Perk
									</span>
								) : null}
							</div>
						</motion.div>
					);
				})}
			</div>

			{/* Milestone legend */}
			<div className='flex flex-wrap items-center gap-x-4 gap-y-2 pt-1'>
				<div className='flex items-center gap-x-1.5 text-xs text-muted-foreground'>
					<span className='w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center shrink-0'>
						<Check className='w-2 h-2 text-white stroke-[3]' />
					</span>
					Claimed
				</div>
				<div className='flex items-center gap-x-1.5 text-xs text-muted-foreground'>
					<Zap className='w-3 h-3 text-orange-500 shrink-0' />
					Today
				</div>
				<div className='flex items-center gap-x-1.5 text-xs text-muted-foreground'>
					<Star className='w-3 h-3 text-amber-500 fill-amber-500/30 shrink-0' />
					Milestone (Coin + Coupon)
				</div>
			</div>

			{/* Bottom Action Footer */}
			<div className='pt-1 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/10'>
				<div className='text-xs sm:text-sm text-muted-foreground flex items-center gap-x-2 shrink'>
					<AlertCircle className='w-4 h-4 text-amber-500 shrink-0' />
					<span>Progress does not reset when you skip a day. Every check-in counts!</span>
				</div>

				<Button
					onClick={claimedState && onClose ? onClose : handleClaim}
					disabled={loading || (claimedState && !onClose)}
					variant='orange-gradient'
					className={cn('h-10 px-6 sm:px-8 rounded-full font-black text-xs sm:text-sm shadow-md transition-all shrink-0 w-full sm:w-auto', {
						'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer': claimedState && Boolean(onClose),
						'opacity-70 cursor-not-allowed bg-emerald-600 hover:bg-emerald-600 text-white': claimedState && !onClose,
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
							<span>{onClose ? "Today's Reward Claimed (Close)" : "Today's Reward Claimed"}</span>
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
