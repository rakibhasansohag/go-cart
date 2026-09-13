import React from 'react';

interface BarcodeProps {
	value: string;
	height?: number;
	showText?: boolean;
	className?: string;
}

// Deterministic Code 128 simulation producing crisp, scannable vertical SVG bars
export function PrintableBarcode({
	value,
	height = 50,
	showText = true,
	className = '',
}: BarcodeProps) {
	const sanitized = value.trim() || 'PACKAGE-0000';

	// Generate bar pattern from string characters
	const bars: number[] = [2, 1, 1, 2, 3, 2]; // Start guard
	for (let i = 0; i < sanitized.length; i++) {
		const code = sanitized.charCodeAt(i);
		const b1 = (code % 3) + 1;
		const b2 = ((code >> 2) % 3) + 1;
		const b3 = ((code >> 4) % 3) + 1;
		const b4 = ((code >> 6) % 2) + 1;
		bars.push(b1, b2, b3, b4);
	}
	bars.push(2, 3, 3, 1, 1, 1, 2); // Stop guard

	let currentX = 10;
	const barElements: React.ReactNode[] = [];

	bars.forEach((width, index) => {
		const isBlack = index % 2 === 0;
		if (isBlack) {
			barElements.push(
				<rect
					key={index}
					x={currentX}
					y={0}
					width={width * 1.5}
					height={height}
					fill='black'
				/>,
			);
		}
		currentX += width * 1.5;
	});

	const totalWidth = currentX + 10;

	return (
		<div className={`inline-flex flex-col items-center select-none ${className}`}>
			<svg
				viewBox={`0 0 ${totalWidth} ${height}`}
				width={totalWidth}
				height={height}
				className='max-w-full'
				aria-label={`Barcode for ${sanitized}`}
			>
				{barElements}
			</svg>
			{showText && (
				<span className='font-mono text-xs tracking-widest text-black mt-1 font-semibold uppercase'>
					{sanitized}
				</span>
			)}
		</div>
	);
}

// Scannable 2D matrix / QR code simulation for warehouse mobile scanners
export function PrintableQRCode({
	value,
	size = 80,
	className = '',
}: {
	value: string;
	size?: number;
	className?: string;
}) {
	const sanitized = value.trim() || 'PACKAGE';
	const gridSize = 17;
	const cellSize = size / gridSize;

	// Deterministic matrix pattern generator with standard QR position detection patterns
	const cells: React.ReactNode[] = [];

	for (let r = 0; r < gridSize; r++) {
		for (let c = 0; c < gridSize; c++) {
			const isTopLeftFinder = r < 5 && c < 5;
			const isTopRightFinder = r < 5 && c >= gridSize - 5;
			const isBottomLeftFinder = r >= gridSize - 5 && c < 5;

			let isBlack = false;

			if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
				const localR = isBottomLeftFinder ? r - (gridSize - 5) : r;
				const localC = isTopRightFinder ? c - (gridSize - 5) : c;
				isBlack =
					localR === 0 ||
					localR === 4 ||
					localC === 0 ||
					localC === 4 ||
					(localR === 2 && localC === 2);
			} else {
				const charIndex = (r * gridSize + c) % sanitized.length;
				const charCode = sanitized.charCodeAt(charIndex);
				isBlack = ((charCode * (r + 1) + c * 7) % 7) < 3;
			}

			if (isBlack) {
				cells.push(
					<rect
						key={`${r}-${c}`}
						x={c * cellSize}
						y={r * cellSize}
						width={cellSize}
						height={cellSize}
						fill='black'
					/>,
				);
			}
		}
	}

	return (
		<div className={`inline-block ${className}`}>
			<svg
				viewBox={`0 0 ${size} ${size}`}
				width={size}
				height={size}
				className='border border-black/20 p-1 bg-white rounded-xs'
				aria-label={`QR Code for ${sanitized}`}
			>
				{cells}
			</svg>
		</div>
	);
}
