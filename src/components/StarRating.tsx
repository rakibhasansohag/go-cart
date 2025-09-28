'use client';

import React from 'react';
import ReactStars from 'react-rating-stars-component';

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
	const fill = filled ? color : 'none';
	const stroke = filled ? color : color;
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width={size}
			height={size}
			viewBox='0 0 24 24'
			aria-hidden
			style={{
				display: 'inline-block',
				verticalAlign: 'middle',
				lineHeight: 0,
			}}
		>
			<path
				d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z'
				fill={fill}
				stroke={stroke}
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
	const wrapperStyle: React.CSSProperties = {
		position: 'relative',
		display: 'inline-block',
		width: size,
		height: size,
		lineHeight: 0,
		verticalAlign: 'middle',
	};

	const filledStyle: React.CSSProperties = {
		position: 'absolute',
		inset: 0,
		overflow: 'hidden',

		clipPath: 'inset(0 50% 0 0)',
		WebkitClipPath: 'inset(0 50% 0 0)',
	};

	const emptyStyle: React.CSSProperties = {
		position: 'absolute',
		inset: 0,
		pointerEvents: 'none',
	};

	return (
		<span style={wrapperStyle} aria-hidden>
			<span style={emptyStyle}>
				<StarSVG size={size} color={color} filled={false} strokeWidth={1.2} />
			</span>
			<span style={filledStyle}>
				<StarSVG
					size={size}
					color={activeColor}
					filled={true}
					strokeWidth={0}
				/>
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
	const emptyIcon = (
		<span aria-hidden style={{ display: 'inline-block', lineHeight: 0 }}>
			<StarSVG size={size} color={color} filled={false} strokeWidth={1.2} />
		</span>
	);

	const filledIcon = (
		<span aria-hidden style={{ display: 'inline-block', lineHeight: 0 }}>
			<StarSVG size={size} color={activeColor} filled={true} strokeWidth={0} />
		</span>
	);

	const halfIcon = (
		<HalfStar size={size} color={color} activeColor={activeColor} />
	);

	return (
		<div className={className}>
			<ReactStars
				count={count}
				value={value}
				size={size}
				color={color}
				activeColor={activeColor}
				isHalf={isHalf}
				edit={edit}
				onChange={onChange}
				emptyIcon={emptyIcon}
				halfIcon={halfIcon}
				filledIcon={filledIcon}
			/>
		</div>
	);
}
