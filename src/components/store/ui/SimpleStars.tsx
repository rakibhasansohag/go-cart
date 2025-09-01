'use client';
import React from 'react';

type Props = {
	value?: number;
	size?: number;
	className?: string;
};

export default function SimpleStars({
	value = 0,
	size = 14,
	className = '',
}: Props) {
	const full = Math.floor(value);
	const half = value - full >= 0.5;
	const total = 5;

	return (
		<span className={`inline-flex items-center gap-1 ${className}`} aria-hidden>
			{Array.from({ length: total }).map((_, i) => {
				const idx = i + 1;
				const fillType =
					idx <= full ? 'full' : idx === full + 1 && half ? 'half' : 'empty';
				return (
					<svg
						key={i}
						width={size}
						height={size}
						viewBox='0 0 24 24'
						fill='none'
						xmlns='http://www.w3.org/2000/svg'
						style={{ display: 'inline-block', verticalAlign: 'middle' }}
					>
						{fillType === 'half' ? (
							<>
								<defs>
									<linearGradient id={`half-grad-${i}`} x1='0' x2='1'>
										<stop offset='50%' stopColor='currentColor' />
										<stop
											offset='50%'
											stopColor='var(--color-muted, rgba(0,0,0,0.15))'
										/>
									</linearGradient>
								</defs>
								<path
									d='M12 .587l3.668 7.431L23.6 9.75l-5.8 5.648L19.335 24 12 19.897 4.665 24l1.535-8.602L.4 9.75l7.932-1.732z'
									fill={`url(#half-grad-${i})`}
								/>
							</>
						) : (
							<path
								d='M12 .587l3.668 7.431L23.6 9.75l-5.8 5.648L19.335 24 12 19.897 4.665 24l1.535-8.602L.4 9.75l7.932-1.732z'
								fill={
									fillType === 'full'
										? 'currentColor'
										: 'var(--color-muted, rgba(0,0,0,0.15))'
								}
							/>
						)}
					</svg>
				);
			})}
		</span>
	);
}
