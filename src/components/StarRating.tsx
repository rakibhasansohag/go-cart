'use client';

import React from 'react';

type StarRatingProps = {
	count?: number;
	value?: number;
	size?: number;
	color?: string;
	activeColor?: string;
	isHalf?: boolean;
	edit?: boolean;
	onChange?: (n: number) => void;
	className?: string;
};

function StarSVG({
	color = 'currentColor',
	size = 24,
	filled = false,
	strokeWidth = 1.2,
}: {
	color?: string;
	size?: number;
	filled?: boolean;
	strokeWidth?: number;
}) {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width={size}
			height={size}
			viewBox='0 0 24 24'
			aria-hidden
			style={{ display: 'inline-block', verticalAlign: 'middle', lineHeight: 0 }}
		>
			<path
				d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z'
				fill={filled ? color : 'none'}
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinejoin='round'
				strokeLinecap='round'
			/>
		</svg>
	);
}

function HalfStar({
	size,
	color,
	activeColor,
}: {
	size: number;
	color: string;
	activeColor: string;
}) {
	return (
		<span
			aria-hidden
			style={{
				position: 'relative',
				display: 'inline-block',
				width: size,
				height: size,
				lineHeight: 0,
				verticalAlign: 'middle',
			}}
		>
			{/* empty bg */}
			<span style={{ position: 'absolute', inset: 0 }}>
				<StarSVG size={size} color={color} filled={false} strokeWidth={1.2} />
			</span>
			{/* filled left half */}
			<span
				style={{
					position: 'absolute',
					inset: 0,
					overflow: 'hidden',
					clipPath: 'inset(0 50% 0 0)',
				}}
			>
				<StarSVG size={size} color={activeColor} filled strokeWidth={0} />
			</span>
		</span>
	);
}

export default function StarRating({
	count = 5,
	value = 0,
	size = 20,
	color = '#e2dfdf',
	activeColor = '#FFD804',
	isHalf = true,
	edit = false,
	onChange,
	className,
}: StarRatingProps) {
	const stars = Array.from({ length: count }, (_, i) => {
		const starNumber = i + 1;
		const filled = value >= starNumber;
		const half = !filled && isHalf && value >= starNumber - 0.5;

		const handleClick = () => {
			if (edit && onChange) onChange(starNumber);
		};

		return (
			<span
				key={i}
				onClick={handleClick}
				style={{
					cursor: edit ? 'pointer' : 'default',
					display: 'inline-block',
					lineHeight: 0,
				}}
				aria-label={`${starNumber} star`}
			>
				{half ? (
					<HalfStar size={size} color={color} activeColor={activeColor} />
				) : (
					<StarSVG size={size} color={filled ? activeColor : color} filled={filled} strokeWidth={filled ? 0 : 1.2} />
				)}
			</span>
		);
	});

	return (
		<div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
			{stars}
		</div>
	);
}
