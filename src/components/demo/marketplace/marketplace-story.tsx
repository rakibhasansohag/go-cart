'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
	ArrowRight,
	Banknote,
	CalendarClock,
	Check,
	CircleDollarSign,
	Clock3,
	LockKeyhole,
	PackageCheck,
	Play,
	RotateCcw,
	ShoppingBag,
	ShieldCheck,
	Truck,
	WalletCards,
	type LucideIcon,
} from 'lucide-react';
import { FLOW_STAGES, nextStageIndex, progressPercent } from './flow';

const stageIcons: Record<(typeof FLOW_STAGES)[number]['id'], LucideIcon> = {
	order: ShoppingBag,
	hold: LockKeyhole,
	delivery: Truck,
	returns: RotateCcw,
	payday: CalendarClock,
	payout: Banknote,
};

const orderLines = [
	['Merchandise', '$120.00'],
	['Shipping + tax', '$8.00'],
	['Order total', '$128.00'],
];

export default function MarketplaceStory() {
	const [stageIndex, setStageIndex] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);
	const currentStage = FLOW_STAGES[stageIndex];
	const isComplete = stageIndex === FLOW_STAGES.length - 1;

	useEffect(() => {
		if (!isPlaying) return;

		if (isComplete) return;

		const timer = window.setTimeout(() => {
			setStageIndex((current) => nextStageIndex(current));
		}, 1200);

		return () => window.clearTimeout(timer);
	}, [isComplete, isPlaying]);

	function handlePlay() {
		if (isComplete) setStageIndex(0);
		setIsPlaying(true);
	}

	function handleReset() {
		setIsPlaying(false);
		setStageIndex(0);
	}

	return (
		<div className='relative isolate overflow-hidden bg-background text-foreground'>
			<div className='pointer-events-none absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl' />
			<div className='pointer-events-none absolute -right-28 top-[32rem] -z-10 h-96 w-96 rounded-full bg-orange-primary/10 blur-3xl' />

			<header className='border-b border-border/70'>
				<div className='mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8'>
					<Link href='/' className='inline-flex items-center gap-2 rounded-lg text-sm font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
						<span className='grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground'>
							<WalletCards className='size-4' aria-hidden='true' />
						</span>
						GoCart
					</Link>
					<nav aria-label='Demo navigation' className='flex items-center gap-3 text-sm'>
						<span className='hidden text-muted-foreground sm:inline'>Portfolio demo</span>
						<a href='#how-it-works' className='rounded-lg px-3 py-2 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'>
							How it works
						</a>
					</nav>
				</div>
			</header>

			<main>
				<section aria-labelledby='marketplace-demo-title' className='mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20'>
					<div className='grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]'>
						<div className='max-w-3xl'>
							<div className='mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary'>
								<CircleDollarSign className='size-3.5' aria-hidden='true' />
								Marketplace funds flow
							</div>
							<h1 id='marketplace-demo-title' className='max-w-3xl text-4xl font-black tracking-tight text-foreground sm:text-6xl sm:leading-[1.02]'>
								From checkout to a confident seller payday.
							</h1>
							<p className='mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg'>
								See how GoCart keeps marketplace money understandable: capture the order, protect the return window, review the weekly batch, then release the seller’s final balance.
							</p>
							<div className='mt-8 flex flex-col gap-3 sm:flex-row sm:items-center'>
								<button
									type='button'
									onClick={handlePlay}
					disabled={isPlaying && !isComplete}
									className='inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/10 transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none motion-reduce:hover:transform-none'
								>
									<Play className='size-4 fill-current' aria-hidden='true' />
					{isPlaying && !isComplete ? 'Playing the flow…' : isComplete ? 'Replay the story' : 'Play the 30-second story'}
								</button>
								<button
									type='button'
									onClick={handleReset}
									disabled={!stageIndex && !isPlaying}
									className='inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none'
								>
									Reset demo
								</button>
							</div>
							<p className='mt-3 text-xs text-muted-foreground'>No payment, account, or personal information is used in this simulation.</p>
						</div>

						<aside aria-labelledby='demo-promise-title' className='rounded-3xl border border-border bg-card/80 p-6 shadow-xl shadow-primary/5 backdrop-blur sm:p-7'>
							<div className='flex items-start justify-between gap-4'>
								<div>
									<p className='text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground'>
										The simple promise
									</p>
									<h2 id='demo-promise-title' className='mt-2 text-2xl font-bold tracking-tight'>
										Every dollar has a visible state.
									</h2>
								</div>
								<ShieldCheck className='size-7 shrink-0 text-emerald-500' aria-hidden='true' />
							</div>
							<div className='mt-6 grid gap-3 text-sm'>
								<div className='flex items-start gap-3 rounded-2xl bg-muted/60 p-3.5'>
									<Check className='mt-0.5 size-4 shrink-0 text-emerald-500' aria-hidden='true' />
									<span><strong className='font-semibold text-foreground'>Buyer first:</strong> delivery and the seven-day return window are clear.</span>
								</div>
								<div className='flex items-start gap-3 rounded-2xl bg-muted/60 p-3.5'>
									<Check className='mt-0.5 size-4 shrink-0 text-emerald-500' aria-hidden='true' />
									<span><strong className='font-semibold text-foreground'>Seller clarity:</strong> pending, eligible, and paid never blur together.</span>
								</div>
								<div className='flex items-start gap-3 rounded-2xl bg-muted/60 p-3.5'>
									<Check className='mt-0.5 size-4 shrink-0 text-emerald-500' aria-hidden='true' />
									<span><strong className='font-semibold text-foreground'>Admin control:</strong> the weekly batch is reviewable before release.</span>
								</div>
							</div>
						</aside>
					</div>
				</section>

				<section id='how-it-works' aria-labelledby='timeline-title' className='border-y border-border/70 bg-muted/25'>
					<div className='mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20'>
						<div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
							<div>
								<p className='text-xs font-bold uppercase tracking-[0.16em] text-primary'>
									Live simulation
								</p>
								<h2 id='timeline-title' className='mt-2 text-3xl font-black tracking-tight sm:text-4xl'>
									One order. Six accountable moments.
								</h2>
							</div>
							<div className='flex items-center gap-2 text-sm text-muted-foreground' aria-live='polite'>
								<span className='size-2 rounded-full bg-emerald-500' aria-hidden='true' />
								{isPlaying && !isComplete ? 'Simulation running' : `${progressPercent(stageIndex)}% of the story explored`}
							</div>
						</div>

						<div className='mt-10 grid gap-8 lg:grid-cols-[1fr_0.82fr]'>
							<div className='relative'>
								<div className='absolute left-5 top-6 hidden h-[calc(100%-3rem)] w-px bg-border sm:block' aria-hidden='true' />
								<div className='absolute left-5 top-6 hidden w-px bg-primary transition-[height] duration-500 sm:block motion-reduce:transition-none' style={{ height: `${Math.max(progressPercent(stageIndex), 3)}%` }} aria-hidden='true' />
								<ol className='grid gap-3' aria-label='Marketplace funds flow stages'>
									{FLOW_STAGES.map((stage, index) => {
										const Icon = stageIcons[stage.id];
										const isActive = index === stageIndex;
										const isPast = index < stageIndex;

										return (
											<li key={stage.id} className='relative sm:pl-14'>
												<button
													type='button'
													onClick={() => { setIsPlaying(false); setStageIndex(index); }}
													aria-current={isActive ? 'step' : undefined}
													aria-label={`Show ${stage.label}`}
													className={`group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-[border-color,background-color,transform,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${isActive ? 'border-primary/40 bg-card shadow-lg shadow-primary/5' : 'border-transparent hover:border-border hover:bg-card/70'} ${isPast ? 'opacity-90' : ''}`}
												>
													<span className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-xl border transition-colors duration-300 motion-reduce:transition-none ${isActive || isPast ? 'border-primary/30 bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}>
														{isPast ? <Check className='size-4' aria-hidden='true' /> : <Icon className='size-4' aria-hidden='true' />}
													</span>
													<span className='min-w-0 flex-1'>
														<span className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1'>
															<strong className='text-sm font-bold text-foreground sm:text-base'>{stage.label}</strong>
															<span className='text-xs font-medium text-muted-foreground'>{stage.time}</span>
														</span>
														<span className='mt-1 block text-sm text-muted-foreground'>{stage.caption}</span>
													</span>
												</button>
											</li>
										);
									})}
								</ol>
							</div>

							<aside aria-labelledby='stage-detail-title' className='h-fit rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5 sm:p-7 lg:sticky lg:top-6'>
								<div className='flex items-center justify-between gap-4'>
									<span className='inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary'>
										<Clock3 className='size-3.5' aria-hidden='true' />
										Current moment
									</span>
									<span className='text-xs font-semibold text-muted-foreground'>Step {stageIndex + 1} / {FLOW_STAGES.length}</span>
								</div>
								<h3 id='stage-detail-title' className='mt-5 text-2xl font-black tracking-tight'>{currentStage.label}</h3>
								<p className='mt-3 leading-7 text-muted-foreground'>{currentStage.description}</p>
								<div className='mt-7 rounded-2xl border border-border bg-muted/45 p-4'>
									<div className='flex items-center justify-between text-sm'>
										<span className='font-semibold text-foreground'>Seller balance</span>
										<span className={`font-mono font-bold ${stageIndex >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
											{stageIndex >= 3 ? 'Eligible' : 'Pending'}
										</span>
									</div>
									<div className='mt-3 h-2 overflow-hidden rounded-full bg-border'>
										<div className='h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none' style={{ width: `${Math.max(progressPercent(stageIndex), 8)}%` }} />
									</div>
									<p className='mt-3 text-xs leading-5 text-muted-foreground'>
										The amount becomes payable only after delivery, the seven-day window, and admin payday review.
									</p>
								</div>
								<div className='mt-6 flex items-center justify-between gap-3 border-t border-border pt-5'>
									<span className='text-sm font-semibold text-muted-foreground'>Next checkpoint</span>
									{isComplete ? <span className='inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400'><Check className='size-4' aria-hidden='true' /> Complete</span> : <span className='inline-flex items-center gap-1 text-sm font-bold text-foreground'>Continue <ArrowRight className='size-4' aria-hidden='true' /></span>}
								</div>
							</aside>
						</div>
					</div>
				</section>

				<section aria-labelledby='ledger-title' className='mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20'>
					<div className='grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start'>
						<div>
							<p className='text-xs font-bold uppercase tracking-[0.16em] text-primary'>
								A statement people can trust
							</p>
							<h2 id='ledger-title' className='mt-2 text-3xl font-black tracking-tight sm:text-4xl'>
								The payday math is visible.
							</h2>
							<p className='mt-4 max-w-xl leading-7 text-muted-foreground'>
								The seller does not have to guess what “available” means. Each number has a job, and the commission is explained at the platform level.
							</p>
							<Link
								href='/auth/sign-in?redirect_url=%2Fdashboard%2Fseller%2Fstores%2Fgocart-demo-store%2Fsettings'
								className='mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none'
							>
								<span className='grid size-6 place-items-center rounded-md bg-[#635bff] text-white' aria-hidden='true'>S</span>
								Try Stripe Sandbox onboarding
								<ArrowRight className='size-4' aria-hidden='true' />
							</Link>
							<p className='mt-2 text-xs text-muted-foreground'>Optional reviewer path · opens the protected seller setup.</p>
						</div>

						<div className='overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/5'>
							<div className='flex items-center justify-between border-b border-border bg-muted/35 px-5 py-4 sm:px-6'>
								<div>
									<p className='text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground'>Order statement</p>
									<p className='mt-1 font-mono text-sm font-bold text-foreground'>Marketplace order · USD</p>
								</div>
								<span className='rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300'>Pending → paid</span>
							</div>
							<div className='p-5 sm:p-6'>
								<div className='grid gap-3'>
									{orderLines.map(([label, value], index) => (
										<div key={label} className={`flex items-center justify-between gap-4 text-sm ${index === orderLines.length - 1 ? 'border-t border-border pt-4 font-bold text-foreground' : 'text-muted-foreground'}`}>
											<span>{label}</span>
											<span className='font-mono'>{value}</span>
										</div>
									))}
								</div>
								<div className='my-5 border-t border-dashed border-border' />
								<div className='grid gap-3'>
									<div className='flex items-center justify-between gap-4 text-sm text-muted-foreground'><span>Seller amount after discounts</span><span className='font-mono'>$118.86</span></div>
									<div className='flex items-center justify-between gap-4 text-sm text-muted-foreground'><span>GoCart commission · 2%</span><span className='font-mono text-orange-secondary'>−$2.38</span></div>
									<div className='flex items-center justify-between gap-4 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300'><span>Seller payday amount</span><span className='font-mono'>$116.48</span></div>
								</div>
								<div className='mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground'>
									<span className='rounded-full border border-border px-2.5 py-1'>USD ledger</span>
									<span className='rounded-full border border-border px-2.5 py-1'>Provider fees: GoCart</span>
									<span className='rounded-full border border-border px-2.5 py-1'>Weekly review</span>
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>

			<footer className='border-t border-border/70'>
				<div className='mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8'>
					<p>GoCart marketplace demo · designed for clear buyer, seller, and admin conversations.</p>
					<p className='inline-flex items-center gap-1.5'><PackageCheck className='size-3.5' aria-hidden='true' /> Simulated data only</p>
				</div>
			</footer>
		</div>
	);
}
