import React from 'react';

export default function SellerLoading() {
	return (
		<div className='min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden font-sans relative'>
			{/* Left Sidebar Skeleton */}
			<div className='w-64 border-r border-slate-800/80 bg-slate-900/40 p-6 flex flex-col gap-6 hidden md:flex shrink-0'>
				<div className='flex items-center gap-3 mb-4'>
					<div className='w-9 h-9 rounded-lg bg-orange-500/20 animate-pulse border border-orange-500/30 flex items-center justify-center'>
						<div className='w-4 h-4 rounded bg-orange-500/40' />
					</div>
					<div className='h-5 w-24 rounded bg-slate-800 animate-pulse' />
				</div>
				<div className='flex flex-col gap-4 flex-1'>
					{[1, 2, 3, 4, 5].map((i) => (
						<div key={i} className='flex items-center gap-3 py-1'>
							<div className='w-5 h-5 rounded bg-slate-800 animate-pulse' />
							<div className='h-4 w-32 rounded bg-slate-800 animate-pulse' />
						</div>
					))}
				</div>
				<div className='mt-auto flex items-center gap-3 pt-4 border-t border-slate-800/60'>
					<div className='w-8 h-8 rounded-full bg-slate-800 animate-pulse' />
					<div className='flex-1 space-y-1.5'>
						<div className='h-3 w-20 rounded bg-slate-800' />
						<div className='h-2.5 w-16 rounded bg-slate-800/60' />
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className='flex-1 flex flex-col overflow-hidden'>
				{/* Top Bar Skeleton */}
				<div className='h-16 border-b border-slate-800/80 bg-slate-900/20 px-6 flex items-center justify-between shrink-0'>
					<div className='w-64 h-9 rounded-lg bg-slate-900 border border-slate-800/80 animate-pulse' />
					<div className='flex items-center gap-4'>
						<div className='w-8 h-8 rounded-full bg-slate-800 animate-pulse' />
						<div className='w-8 h-8 rounded-full bg-slate-800 animate-pulse' />
						<div className='w-[1px] h-6 bg-slate-800' />
						<div className='w-24 h-5 rounded bg-slate-800 animate-pulse' />
					</div>
				</div>

				{/* Dashboard Body Skeleton with Center Loading Overlay */}
				<div className='flex-1 p-6 lg:p-8 space-y-6 overflow-hidden relative'>
					{/* Stat Cards Grid Skeleton */}
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'>
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className='p-5 rounded-xl border border-slate-800/50 bg-slate-900/20 space-y-3'>
								<div className='flex justify-between items-center'>
									<div className='h-3.5 w-24 rounded bg-slate-800 animate-pulse' />
									<div className='w-8 h-8 rounded-lg bg-slate-800 animate-pulse' />
								</div>
								<div className='h-7 w-20 rounded bg-slate-800 animate-pulse' />
								<div className='h-3 w-32 rounded bg-slate-800/60' />
							</div>
						))}
					</div>

					{/* Charts Section Skeleton */}
					<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
						<div className='lg:col-span-2 h-[340px] rounded-xl border border-slate-800/50 bg-slate-900/20 p-5 space-y-4'>
							<div className='h-5 w-48 rounded bg-slate-800' />
							<div className='flex-1 h-[250px] w-full bg-slate-950/40 rounded-lg flex items-end gap-3 p-4'>
								{[...Array(12)].map((_, idx) => (
									<div
										key={idx}
										className='flex-1 bg-slate-800/35 rounded-t animate-pulse'
										style={{ height: `${20 + Math.random() * 60}%` }}
									/>
								))}
							</div>
						</div>
						<div className='h-[340px] rounded-xl border border-slate-800/50 bg-slate-900/20 p-5 space-y-4'>
							<div className='h-5 w-32 rounded bg-slate-800' />
							<div className='w-48 h-48 rounded-full border-[16px] border-slate-800/40 border-t-slate-800/80 mx-auto animate-pulse' />
						</div>
					</div>

					{/* Glassmorphic Central Loading Box */}
					<div className='absolute inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-20'>
						<div className='max-w-md w-full mx-4 p-8 rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-2xl relative overflow-hidden flex flex-col items-center text-center gap-6'>
							{/* Background radial glow */}
							<div className='absolute -top-12 -left-12 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none' />
							<div className='absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none' />

							{/* Seller Icon Chart Animation */}
							<div className='relative w-24 h-24 flex items-center justify-center'>
								{/* Pulse Rings */}
								<div className='absolute inset-0 rounded-full border border-orange-500/15 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]' />
								<div className='absolute -inset-4 rounded-full border border-amber-500/5 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]' />

								{/* Core spinning circle */}
								<svg className='absolute inset-0 w-full h-full rotate-[-90deg]' viewBox='0 0 100 100'>
									<circle
										cx='50'
										cy='50'
										r='44'
										fill='none'
										stroke='#1e293b'
										strokeWidth='6'
									/>
									<circle
										cx='50'
										cy='50'
										r='44'
										fill='none'
										stroke='url(#orangeGrad)'
										strokeWidth='6'
										strokeDasharray='276'
										className='animate-[drawCircle_2s_ease-in-out_infinite]'
										strokeLinecap='round'
									/>
									<defs>
										<linearGradient id='orangeGrad' x1='0%' y1='0%' x2='100%' y2='100%'>
											<stop offset='0%' stopColor='#f97316' />
											<stop offset='100%' stopColor='#fbbf24' />
										</linearGradient>
									</defs>
								</svg>

								{/* Rising sales indicators */}
								<span className='absolute text-[11px] font-bold text-orange-400 opacity-0 animate-[rise_2.2s_ease-out_infinite]'>+$99</span>
								<span className='absolute text-[10px] font-bold text-emerald-400 opacity-0 animate-[rise_1.8s_ease-out_infinite_0.6s]'>+$249</span>
								<span className='absolute text-[9px] font-bold text-amber-300 opacity-0 animate-[rise_2s_ease-out_infinite_1.2s]'>+$49</span>

								{/* Trending chart SVG logo */}
								<svg
									className='w-10 h-10 text-orange-500 z-10'
									fill='none'
									stroke='currentColor'
									strokeWidth='2.5'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										d='M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941'
									/>
								</svg>
							</div>

							{/* Seller Status Messages */}
							<div className='space-y-2.5 z-10'>
								<h3 className='text-xl font-bold bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent animate-pulse'>
									Seller Portal Loading
								</h3>
								<div className='h-5 relative w-64 overflow-hidden flex justify-center items-center'>
									<div className='absolute flex flex-col text-sm text-slate-400 animate-[textFlip_8s_steps(4)_infinite]'>
										<span className='h-5 flex items-center justify-center'>Connecting to merchant networks...</span>
										<span className='h-5 flex items-center justify-center'>Syncing store analytics...</span>
										<span className='h-5 flex items-center justify-center'>Preparing inventory boards...</span>
										<span className='h-5 flex items-center justify-center'>Updating customer metrics...</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Inline CSS animation styles for Keyframe details */}
			<style>{`
				@keyframes drawCircle {
					0% {
						stroke-dashoffset: 276;
						transform: rotate(0deg);
					}
					50% {
						stroke-dashoffset: 60;
						transform: rotate(180deg);
					}
					100% {
						stroke-dashoffset: 276;
						transform: rotate(360deg);
					}
				}
				@keyframes textFlip {
					0%, 20% { transform: translateY(0px); }
					25%, 45% { transform: translateY(-20px); }
					50%, 70% { transform: translateY(-40px); }
					75%, 95% { transform: translateY(-60px); }
					100% { transform: translateY(0px); }
				}
				@keyframes rise {
					0% {
						transform: translateY(15px) scale(0.6);
						opacity: 0;
					}
					20% {
						opacity: 1;
					}
					80% {
						opacity: 0.8;
					}
					100% {
						transform: translateY(-35px) scale(1.1);
						opacity: 0;
					}
				}
			`}</style>
		</div>
	);
}
