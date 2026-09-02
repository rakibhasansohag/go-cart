export default function QAIcon() {
	return (
		<svg
			width={50}
			height={50}
			viewBox='0 0 512 512'
			xmlns='http://www.w3.org/2000/svg'
			className='h-8 w-8 scale-110'
		>
			<defs>
				<linearGradient id='qaGradient' x1='0%' y1='0%' x2='100%' y2='0%'>
					<stop offset='0%' stopColor='#4275E4' />
					<stop offset='100%' stopColor='#A1BCF4' />
				</linearGradient>
			</defs>
			<svg
				width='256px'
				height='256px'
				viewBox='0 0 24 24'
				x={128}
				y={128}
				xmlns='http://www.w3.org/2000/svg'
			>
				<g>
					<path
						fill='url(#qaGradient)'
						d='M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.34 5L2 22l5.18-1.31C8.61 21.53 10.26 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z'
					/>
				</g>
			</svg>
		</svg>
	);
}
