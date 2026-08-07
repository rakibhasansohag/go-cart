'use client';

import { queryKeys } from '@/lib/query-keys';
import { getUserLoyaltyAccount, UserLoyaltyDataType } from '@/queries/loyalty';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Coins, ArrowUpRight, ArrowDownLeft, Clock, History } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { coinsToDiscount } from '@/lib/loyalty/coins';

interface Props {
	initialPage?: number;
}

export default function RewardsContent({ initialPage = 1 }: Props) {
	const [page, setPage] = useState<number>(initialPage);

	const { data } = useSuspenseQuery<UserLoyaltyDataType>({
		queryKey: queryKeys.profile.loyalty(page),
		queryFn: () => getUserLoyaltyAccount(page, 10),
	});

	const { balance, lifetimeEarned, transactions, totalPages, currentPage } = data;
	const redeemableValue = coinsToDiscount(balance);

	return (
		<div className='space-y-6'>
			{/* Balance Card */}
			<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-6 text-white shadow-lg'>
				<div className='absolute -right-6 -bottom-6 opacity-10'>
					<Coins className='w-48 h-48' />
				</div>
				<div className='relative z-10 space-y-4'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-x-2'>
							<Coins className='w-6 h-6 text-amber-200' />
							<span className='font-semibold text-amber-100 text-sm tracking-wide uppercase'>
								GoCoins Balance
							</span>
						</div>
						<span className='text-xs font-semibold bg-amber-900/40 border border-amber-300/30 px-3 py-1 rounded-full text-amber-100 backdrop-blur-sm'>
							2% Cashback Rate
						</span>
					</div>

					<div className='flex items-baseline gap-x-3'>
						<span className='text-4xl sm:text-5xl font-black tracking-tight'>
							{balance.toLocaleString()}
						</span>
						<span className='text-lg font-medium text-amber-200'>GoCoins</span>
					</div>

					<div className='pt-2 border-t border-amber-400/20 flex flex-wrap items-center justify-between text-sm text-amber-100/90 gap-2'>
						<div>
							<span>Redeemable Value: </span>
							<strong className='text-white font-bold'>${redeemableValue.toFixed(2)}</strong>
						</div>
						<div>
							<span>Lifetime Earned: </span>
							<strong className='text-white font-bold'>{lifetimeEarned.toLocaleString()} coins</strong>
						</div>
					</div>
				</div>
			</div>

			{/* How it works info banner */}
			<div className='rounded-xl bg-background p-4 border border-border/10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-main-secondary'>
				<div className='space-y-1'>
					<p className='font-semibold text-main-primary text-sm'>How GoCoins Work</p>
					<p>Earn 2 coins for every $1 paid on completed orders. 100 coins = $1 discount at checkout (up to 30% of subtotal).</p>
				</div>
				<Link href='/browse' className='shrink-0 px-4 py-2 rounded-lg bg-secondary font-medium text-main-primary hover:bg-border/20 transition-colors'>
					Shop & Earn
				</Link>
			</div>

			{/* Transaction History */}
			<div className='rounded-xl bg-background p-6 border border-border/10 shadow-sm space-y-4'>
				<div className='flex items-center justify-between'>
					<h2 className='text-lg font-bold text-main-primary flex items-center gap-x-2'>
						<History className='w-5 h-5 text-main-secondary' />
						<span>Coin History</span>
					</h2>
				</div>

				{transactions.length === 0 ? (
					<div className='py-12 text-center text-main-secondary space-y-2'>
						<Clock className='w-8 h-8 mx-auto text-main-secondary/40' />
						<p className='font-medium'>No GoCoins transactions yet</p>
						<p className='text-xs'>Earn coins automatically whenever you complete a purchase!</p>
					</div>
				) : (
					<div className='divide-y divide-border/10'>
						{transactions.map((tx) => {
							const isEarn = tx.type === 'EARN';
							return (
								<div key={tx.id} className='py-3.5 flex items-center justify-between text-sm gap-4'>
									<div className='flex items-center gap-x-3 min-w-0'>
										<div
											className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
												isEarn
													? 'bg-emerald-500/10 text-emerald-500'
													: 'bg-amber-500/10 text-amber-500'
											}`}
										>
											{isEarn ? (
												<ArrowDownLeft className='w-5 h-5' />
											) : (
												<ArrowUpRight className='w-5 h-5' />
											)}
										</div>
										<div className='min-w-0'>
											<p className='font-medium text-main-primary truncate'>
												{tx.note || (isEarn ? 'Earned GoCoins' : 'Redeemed GoCoins')}
											</p>
											<p className='text-xs text-main-secondary'>
												{new Date(tx.createdAt).toLocaleDateString(undefined, {
													year: 'numeric',
													month: 'short',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit',
												})}
											</p>
										</div>
									</div>

									<div className='text-right shrink-0'>
										<span
											className={`font-bold text-base ${
												isEarn ? 'text-emerald-500' : 'text-amber-500'
											}`}
										>
											{isEarn ? `+${tx.points}` : tx.points}
										</span>
										<span className='text-xs text-main-secondary block'>
											{isEarn ? 'coins earned' : 'coins used'}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Pagination */}
				{totalPages > 1 && (
					<div className='flex items-center justify-between pt-4 border-t border-border/10 text-xs text-main-secondary'>
						<span>
							Page {currentPage} of {totalPages}
						</span>
						<div className='flex items-center gap-x-2'>
							<button
								type='button'
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								className='px-3 py-1.5 rounded-lg border border-border/20 bg-secondary text-main-primary hover:bg-border/20 disabled:opacity-40 disabled:cursor-not-allowed'
							>
								Previous
							</button>
							<button
								type='button'
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								className='px-3 py-1.5 rounded-lg border border-border/20 bg-secondary text-main-primary hover:bg-border/20 disabled:opacity-40 disabled:cursor-not-allowed'
							>
								Next
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
