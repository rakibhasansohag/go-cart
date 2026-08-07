'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDailyCheckInStatus } from '@/queries/checkin';
import CheckInCalendar from './checkin-calendar';
import { X, Sparkles, Trophy } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export default function CheckInModal() {
	const { isLoaded, isSignedIn } = useUser();
	const [isOpen, setIsOpen] = useState(false);
	const [statusData, setStatusData] = useState<Awaited<ReturnType<typeof getDailyCheckInStatus>> | null>(null);

	useEffect(() => {
		if (!isLoaded || !isSignedIn) return;

		let isCancelled = false;
		async function checkStatus() {
			try {
				const status = await getDailyCheckInStatus();
				if (isCancelled) return;
				setStatusData(status);

				const dismissedKey = `gocart_checkin_dismissed_${status.todayDateStr}`;
				const isDismissed = localStorage.getItem(dismissedKey);

				// Auto-open modal if user hasn't claimed today and hasn't dismissed it today
				if (status.isAuthenticated && !status.hasClaimedToday && !isDismissed) {
					setIsOpen(true);
				}
			} catch (err) {
				console.warn('Failed to fetch daily check-in status:', err);
			}
		}

		checkStatus();
		return () => {
			isCancelled = true;
		};
	}, [isLoaded, isSignedIn]);

	const handleClose = () => {
		if (statusData?.todayDateStr) {
			localStorage.setItem(`gocart_checkin_dismissed_${statusData.todayDateStr}`, 'true');
		}
		setIsOpen(false);
	};

	if (!isSignedIn || !statusData) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto'>
					<motion.div
						initial={{ opacity: 0, scale: 0.9, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: 20 }}
						transition={{ type: 'spring', damping: 25, stiffness: 300 }}
						className='relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-white/10'
					>
						{/* Close Button */}
						<button
							onClick={handleClose}
							className='absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-md transition-colors'
						>
							<X className='w-5 h-5' />
						</button>

						{/* Top Banner */}
						<div className='bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 p-6 text-white text-center relative overflow-hidden'>
							<div className='absolute -right-10 -bottom-10 opacity-20 pointer-events-none'>
								<Trophy className='w-48 h-48 text-white' />
							</div>
							<div className='relative z-10 flex flex-col items-center justify-center gap-y-1.5'>
								<div className='inline-flex items-center gap-x-2 bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider'>
									<Sparkles className='w-3.5 h-3.5' /> Daily Visitor Reward
								</div>
								<h1 className='text-2xl sm:text-3xl font-extrabold tracking-tight'>
									Claim Your Daily GoCoins & Coupons!
								</h1>
								<p className='text-xs sm:text-sm text-white/90 max-w-lg'>
									Welcome back! Check in each day of the month to unlock GoCoins balance, free shipping perks, and personal promo codes.
								</p>
							</div>
						</div>

						{/* Calendar Container */}
						<div className='bg-background p-4 sm:p-6'>
							<CheckInCalendar
								hasClaimedToday={statusData.hasClaimedToday}
								claimedDaysCount={statusData.claimedDaysCount}
								daysInMonth={statusData.daysInMonth}
								todayDateStr={statusData.todayDateStr}
								checkIns={statusData.checkIns}
								onClaimSuccess={() => {
									setStatusData((prev) => (prev ? { ...prev, hasClaimedToday: true } : null));
								}}
							/>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
}
