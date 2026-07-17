import React from 'react';

export default function SellerLoading() {
	return (
		<div className='min-h-screen bg-background text-foreground flex overflow-hidden font-sans relative'>
			{/* Left Sidebar Skeleton */}
			<div className='w-64 border-r border-border bg-card p-6 flex flex-col gap-6 hidden md:flex shrink-0'>
				<div className='flex items-center gap-3 mb-4'>
					<div className='w-9 h-9 rounded-lg bg-muted animate-pulse flex items-center justify-center' />
					<div className='h-5 w-24 rounded bg-muted animate-pulse' />
				</div>
				<div className='flex flex-col gap-5 flex-1'>
					{[1, 2, 3, 4, 5].map((i) => (
						<div key={i} className='flex items-center gap-3 py-1'>
							<div className='w-5 h-5 rounded bg-muted animate-pulse' />
							<div className='h-4 w-32 rounded bg-muted animate-pulse' />
						</div>
					))}
				</div>
				<div className='mt-auto flex items-center gap-3 pt-4 border-t border-border'>
					<div className='w-8 h-8 rounded-full bg-muted animate-pulse' />
					<div className='flex-1 space-y-1.5'>
						<div className='h-3 w-20 rounded bg-muted animate-pulse' />
						<div className='h-2.5 w-16 rounded bg-muted animate-pulse' />
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<div className='flex-1 flex flex-col overflow-hidden'>
				{/* Top Bar Skeleton */}
				<div className='h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0'>
					<div className='w-64 h-9 rounded-lg bg-muted animate-pulse' />
					<div className='flex items-center gap-4'>
						<div className='w-8 h-8 rounded-full bg-muted animate-pulse' />
						<div className='w-8 h-8 rounded-full bg-muted animate-pulse' />
						<div className='w-[1px] h-6 bg-border' />
						<div className='w-24 h-5 rounded bg-muted animate-pulse' />
					</div>
				</div>

				{/* Dashboard Body Skeleton */}
				<div className='flex-1 p-6 lg:p-8 space-y-6 overflow-hidden relative bg-background/50'>
					{/* Stat Cards Grid Skeleton */}
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'>
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className='p-5 rounded-xl border border-border bg-card space-y-3 shadow-sm'>
								<div className='flex justify-between items-center'>
									<div className='h-4 w-24 rounded bg-muted animate-pulse' />
									<div className='w-8 h-8 rounded-lg bg-muted animate-pulse' />
								</div>
								<div className='h-8 w-28 rounded bg-muted animate-pulse' />
								<div className='h-3 w-36 rounded bg-muted animate-pulse' />
							</div>
						))}
					</div>

					{/* Charts Section Skeleton */}
					<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
						<div className='lg:col-span-2 h-[340px] rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm'>
							<div className='h-5 w-48 rounded bg-muted animate-pulse' />
							<div className='flex-1 h-[250px] w-full bg-background/50 rounded-lg flex items-end gap-3 p-4 border border-border'>
								{[...Array(12)].map((_, idx) => (
									<div
										key={idx}
										className='flex-1 bg-muted rounded-t animate-pulse'
										style={{ height: `${20 + Math.random() * 60}%` }}
									/>
								))}
							</div>
						</div>
						<div className='h-[340px] rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm flex flex-col justify-between'>
							<div className='h-5 w-32 rounded bg-muted animate-pulse' />
							<div className='w-48 h-48 rounded-full border-[16px] border-muted border-t-muted-foreground mx-auto animate-pulse flex-1 mt-6' />
						</div>
					</div>

					{/* Glassmorphic Central Loading Box */}
					<div className='absolute inset-0 bg-background/45 backdrop-blur-xl flex items-center justify-center z-20'>
						<div className='max-w-md w-full mx-4 p-8 rounded-2xl border border-border bg-card/85 shadow-2xl relative overflow-hidden flex flex-col items-center text-center gap-6'>
							{/* Spinner */}
							<div className='relative w-16 h-16 flex items-center justify-center'>
								{/* Pulse ring */}
								<div className='absolute inset-0 rounded-full border border-orange-500/20 animate-ping' />
								{/* Rotating Spinner */}
								<svg className='animate-spin h-12 w-12 text-orange-500' fill='none' viewBox='0 0 24 24'>
									<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
									<path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
								</svg>
							</div>

							<div className='space-y-2 z-10'>
								<h3 className='text-xl font-extrabold text-foreground tracking-tight'>
									Loading Store Dashboard
								</h3>
								<p className='text-sm text-muted-foreground max-w-[280px] mx-auto'>
									Retrieving sales data and updating inventory...
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
