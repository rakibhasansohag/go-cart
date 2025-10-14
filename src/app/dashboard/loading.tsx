export default function GlobalLoading() {
	return (
		<div className='min-h-screen grid place-items-center bg-background'>
			<div className='flex flex-col items-center gap-6'>
				{/* Animated segmented ring + pulse */}
				<svg className='w-28 h-28' viewBox='0 0 100 100' aria-hidden>
					<defs>
						<linearGradient id='g1' x1='0' x2='1'>
							<stop offset='0%' stopColor='#ff7a4d' />
							<stop offset='50%' stopColor='#ffbe4d' />
							<stop offset='100%' stopColor='#ffd76d' />
						</linearGradient>
					</defs>

					<g transform='translate(50,50)'>
						{/* background ring */}
						<circle r='40' fill='none' stroke='#11182710' strokeWidth='10' />
						{/* animated arc */}
						<path
							d='M 40 0 A 40 40 0 0 1 0 -40'
							stroke='url(#g1)'
							strokeWidth='10'
							strokeLinecap='round'
							fill='none'
							className='origin-center animate-[spin_1.6s_linear_infinite]'
						/>
						{/* small orbiting dot */}
						<circle
							r='5'
							cx='40'
							cy='0'
							fill='#ff7a4d'
							className='animate-[orbit_1.6s_linear_infinite]'
						/>
					</g>

					<style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes orbit { 
              0% { transform: rotate(0deg) translateX(0) rotate(0deg); } 
              100% { transform: rotate(360deg) translateX(0) rotate(-360deg); } 
            }
          `}</style>
				</svg>

				<div className='text-center'>
					<h3 className='text-xl font-semibold text-main-primary'>
						Loading your experience…
					</h3>
					<p className='text-sm text-muted-foreground mt-1'>
						Hang tight — preparing your dashboard.
					</p>
				</div>

				{/* Skeleton row to hint layout */}
				<div className='w-[90vw] max-w-4xl p-4 bg-white/5 rounded-lg shadow-inner'>
					<div className='flex items-center gap-4'>
						<div className='w-48 h-8 rounded-md bg-slate-200/30 animate-pulse' />
						<div className='flex-1 h-8 rounded-md bg-slate-200/20 animate-pulse' />
					</div>
				</div>
			</div>
		</div>
	);
}
