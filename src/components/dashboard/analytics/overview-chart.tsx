'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export type OverviewChartData = {
	label?: string;
	month?: string;
	revenue: number;
	orders: number;
};

interface OverviewChartProps {
	data: OverviewChartData[];
	title?: string;
	description?: string;
}

export default function OverviewChart({
	data = [],
	title = 'Revenue Overview',
	description = 'Monthly sales performance & order totals',
}: OverviewChartProps) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

	const maxRevenue = Math.max(...data.map((d) => d.revenue), 100);
	const hasRevenue = data.some((d) => d.revenue > 0);

	const formatCurrency = (val: number): string =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: val % 1 === 0 ? 0 : 2,
		}).format(val);

	// Coordinate geometry for SVG trendline overlay (viewBox 1000 x 200)
	const svgWidth = 1000;
	const svgHeight = 200;
	const plotTop = 20;
	const plotBottom = 180;
	const plotRange = plotBottom - plotTop;
	const count = data.length;

	const points = data.map((item, i) => {
		const x = count > 1 ? ((i + 0.5) / count) * svgWidth : svgWidth / 2;
		const ratio = maxRevenue > 0 ? Math.min(Math.max(item.revenue / maxRevenue, 0), 1) : 0;
		const y = plotBottom - ratio * plotRange;
		return { x, y, item, i, ratio };
	});

	// Smooth cubic Bezier spline for trendline
	let splinePath = '';
	let areaPath = '';

	if (points.length === 1) {
		splinePath = `M ${points[0].x - 40} ${points[0].y} L ${points[0].x + 40} ${points[0].y}`;
	} else if (points.length > 1) {
		splinePath = `M ${points[0].x} ${points[0].y}`;
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[i];
			const p1 = points[i + 1];
			const midX = (p0.x + p1.x) / 2;
			splinePath += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
		}
		areaPath = `${splinePath} L ${points[points.length - 1].x} ${plotBottom} L ${points[0].x} ${plotBottom} Z`;
	}

	return (
		<Card className='shadow-xs border border-border/80 dark:border-border/60 bg-card overflow-visible transition-colors'>
			<CardHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2'>
				<div>
					<CardTitle className='text-lg font-semibold tracking-tight text-foreground'>{title}</CardTitle>
					<CardDescription className='text-xs sm:text-sm text-muted-foreground'>{description}</CardDescription>
				</div>
				<div className='flex items-center gap-4 text-xs font-medium text-muted-foreground'>
					{/* Bar Swatch */}
					<div className='flex items-center gap-1.5'>
						<span className='w-3.5 h-3 rounded-xs bg-gradient-to-t from-blue-600 to-indigo-500 dark:from-blue-500 dark:to-cyan-400 inline-block shadow-xs' />
						<span>Revenue ($)</span>
					</div>
					{/* Trendline Swatch */}
					<div className='flex items-center gap-1.5'>
						<div className='relative w-4 h-0.5 bg-indigo-600 dark:bg-cyan-400 rounded-full flex items-center justify-center'>
							<span className='w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900 border border-indigo-600 dark:border-cyan-400' />
						</div>
						<span>Trend</span>
					</div>
				</div>
			</CardHeader>

			<CardContent className='pt-2 sm:pt-4 overflow-visible'>
				<div className='relative w-full px-2 sm:px-4 select-none'>
					{/* Chart Area Container (exact 200px plot matching SVG) */}
					<div className='relative h-[200px] w-full'>
						{/* Horizontal Reference Gridlines */}
						<div className='absolute inset-0 pointer-events-none z-0'>
							{/* Max Revenue Line */}
							<div
								style={{ top: `${plotTop}px` }}
								className='absolute inset-x-0 border-b border-dashed border-gray-200 dark:border-white/10 flex justify-between items-center text-[11px] font-mono font-medium text-gray-500 dark:text-gray-400 px-1 -translate-y-1/2'
							>
								<span>{formatCurrency(maxRevenue)}</span>
							</div>

							{/* Mid Revenue Line */}
							<div
								style={{ top: `${plotTop + plotRange / 2}px` }}
								className='absolute inset-x-0 border-b border-dashed border-gray-200 dark:border-white/10 flex justify-between items-center text-[11px] font-mono font-medium text-gray-500 dark:text-gray-400 px-1 -translate-y-1/2'
							>
								<span>{formatCurrency(Math.round(maxRevenue / 2))}</span>
							</div>

							{/* Zero Line */}
							<div
								style={{ top: `${plotBottom}px` }}
								className='absolute inset-x-0 border-b border-gray-200 dark:border-white/15 flex justify-between items-center text-[11px] font-mono font-medium text-gray-500 dark:text-gray-400 px-1 -translate-y-1/2'
							>
								<span>$0</span>
							</div>
						</div>

						{/* SVG Trendline & Area Gradient Layer */}
						<svg
							className='absolute inset-0 w-full h-[200px] pointer-events-none z-20 overflow-visible'
							viewBox={`0 0 ${svgWidth} ${svgHeight}`}
							preserveAspectRatio='none'
						>
							<defs>
								{/* Light Mode Area Fill */}
								<linearGradient id='trendAreaGradientLight' x1='0' y1='0' x2='0' y2='1'>
									<stop offset='0%' stopColor='#4f46e5' stopOpacity='0.20' />
									<stop offset='85%' stopColor='#4f46e5' stopOpacity='0.02' />
									<stop offset='100%' stopColor='#4f46e5' stopOpacity='0' />
								</linearGradient>
								{/* Dark Mode Area Fill */}
								<linearGradient id='trendAreaGradientDark' x1='0' y1='0' x2='0' y2='1'>
									<stop offset='0%' stopColor='#38bdf8' stopOpacity='0.28' />
									<stop offset='85%' stopColor='#38bdf8' stopOpacity='0.03' />
									<stop offset='100%' stopColor='#38bdf8' stopOpacity='0' />
								</linearGradient>
							</defs>

							{/* Subtle Area Under Trendline */}
							{areaPath && (
								<>
									<path
										d={areaPath}
										className='dark:hidden'
										fill='url(#trendAreaGradientLight)'
									/>
									<path
										d={areaPath}
										className='hidden dark:block'
										fill='url(#trendAreaGradientDark)'
									/>
								</>
							)}

							{/* Smooth Trendline Path */}
							{splinePath && (
								<>
									<path
										d={splinePath}
										fill='none'
										stroke='#4f46e5'
										strokeWidth='2.75'
										strokeLinecap='round'
										strokeLinejoin='round'
										className='dark:hidden transition-all duration-300'
									/>
									<path
										d={splinePath}
										fill='none'
										stroke='#38bdf8'
										strokeWidth='2.75'
										strokeLinecap='round'
										strokeLinejoin='round'
										className='hidden dark:block transition-all duration-300 filter drop-shadow-[0_0_6px_rgba(56,189,248,0.55)]'
									/>
								</>
							)}

							{/* Trendline Marker Nodes */}
							{points.map((pt) => {
								const isHovered = hoveredIndex === pt.i;
								return (
									<g key={pt.i} className='transition-all duration-200'>
										{/* Pulsing halo ring on hover */}
										{isHovered && (
											<circle
												cx={pt.x}
												cy={pt.y}
												r='11'
												className='fill-indigo-500/25 dark:fill-cyan-400/30'
											/>
										)}
										{/* Light Mode Marker Dot */}
										<circle
											cx={pt.x}
											cy={pt.y}
											r={isHovered ? 6 : 4.5}
											fill={isHovered ? '#4f46e5' : '#ffffff'}
											stroke='#4f46e5'
											strokeWidth={isHovered ? 2.5 : 2}
											className='dark:hidden transition-all duration-200'
										/>
										{/* Dark Mode Marker Dot */}
										<circle
											cx={pt.x}
											cy={pt.y}
											r={isHovered ? 6 : 4.5}
											fill={isHovered ? '#38bdf8' : '#0b1220'}
											stroke='#38bdf8'
											strokeWidth={isHovered ? 2.5 : 2}
											className='hidden dark:block transition-all duration-200'
										/>
									</g>
								);
							})}
						</svg>

						{/* Dynamic Floating Tooltip */}
						{hoveredIndex !== null && points[hoveredIndex] && (
							<div
								style={{
									left: `${points[hoveredIndex].x / 10}%`,
									top:
										points[hoveredIndex].y < 65
											? `${points[hoveredIndex].y + 12}px`
											: `${points[hoveredIndex].y - 62}px`,
								}}
								className='absolute z-30 pointer-events-none transform -translate-x-1/2 transition-all duration-150 ease-out'
							>
								{/* Arrow pointing UP when tooltip is below node */}
								{points[hoveredIndex].y < 65 && (
									<div className='w-2 h-2 bg-gray-900 dark:bg-gray-800 border-l border-t border-gray-700/80 transform rotate-45 mx-auto -mb-1' />
								)}

								<div className='bg-gray-900/95 dark:bg-gray-800/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-gray-700/80 text-center backdrop-blur-xs whitespace-nowrap min-w-[110px]'>
									<p className='font-bold text-cyan-300 dark:text-cyan-300 text-sm'>
										{formatCurrency(points[hoveredIndex].item.revenue)}
									</p>
									<p className='text-[11px] text-gray-300 font-medium'>
										{points[hoveredIndex].item.orders} {points[hoveredIndex].item.orders === 1 ? 'order' : 'orders'} • {points[hoveredIndex].item.label ?? points[hoveredIndex].item.month}
									</p>
								</div>

								{/* Arrow pointing DOWN when tooltip is above node */}
								{points[hoveredIndex].y >= 65 && (
									<div className='w-2 h-2 bg-gray-900 dark:bg-gray-800 border-r border-b border-gray-700/80 transform rotate-45 mx-auto -mt-1' />
								)}
							</div>
						)}

						{/* Bars Container */}
						<div
							style={{
								paddingTop: `${plotTop}px`,
								paddingBottom: `${svgHeight - plotBottom}px`,
							}}
							className='relative z-10 h-full w-full flex items-end justify-between'
						>
							{data.map((item, index) => {
								const ratio = maxRevenue > 0 ? Math.min(Math.max(item.revenue / maxRevenue, 0), 1) : 0;
								const heightPx = ratio * plotRange;
								const isHovered = hoveredIndex === index;
								const maxBarWidth =
									count <= 7
										? 'max-w-[32px] sm:max-w-[44px]'
										: count <= 14
										? 'max-w-[18px] sm:max-w-[26px]'
										: 'max-w-[8px] sm:max-w-[14px]';

								return (
									<div
										key={index}
										onMouseEnter={() => setHoveredIndex(index)}
										onMouseLeave={() => setHoveredIndex(null)}
										className='flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group'
									>
										{/* Bar Pillar */}
										<div className='w-full flex items-end h-full justify-center'>
											<div
												style={{
													height: item.revenue > 0 ? `${Math.max(heightPx, 6)}px` : '3px',
												}}
												className={`w-full ${maxBarWidth} transition-all duration-300 rounded-t-md ${
													item.revenue > 0
														? isHovered
															? 'bg-gradient-to-t from-blue-700 via-indigo-600 to-indigo-500 dark:from-blue-500 dark:via-cyan-500 dark:to-cyan-300 shadow-md scale-y-[1.02] origin-bottom'
															: 'bg-gradient-to-t from-blue-600 via-indigo-600 to-indigo-500 dark:from-blue-600 dark:via-cyan-600 dark:to-cyan-400 shadow-xs border-t border-indigo-300/40 dark:border-cyan-300/40'
														: 'bg-gray-200 dark:bg-gray-700/60 rounded-full'
												}`}
											/>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* X-Axis Month Labels Row */}
					<div className='flex items-center justify-between w-full pt-3 border-t border-gray-100 dark:border-white/5'>
						{data.map((item, index) => {
							const isHovered = hoveredIndex === index;
							const monthName = (item.label ?? item.month ?? '').split(' ')[0];
							const showLabel =
								isHovered ||
								count <= 7 ||
								(count <= 14 ? index % 2 === 0 || index === count - 1 : index % 5 === 0 || index === count - 1);

							return (
								<div
									key={index}
									onMouseEnter={() => setHoveredIndex(index)}
									onMouseLeave={() => setHoveredIndex(null)}
									className='flex-1 text-center cursor-pointer flex items-center justify-center min-h-[16px]'
								>
									{showLabel ? (
										<span
											className={`text-xs transition-colors duration-150 truncate ${
												isHovered
													? 'text-foreground font-semibold'
													: 'text-muted-foreground font-medium'
											}`}
										>
											{monthName}
										</span>
									) : (
										<span className='w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700 inline-block' />
									)}
								</div>
							);
						})}
					</div>
				</div>

				{!hasRevenue && (
					<p className='text-xs text-muted-foreground text-center mt-3 italic'>
						No sales activity recorded for the selected range.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
