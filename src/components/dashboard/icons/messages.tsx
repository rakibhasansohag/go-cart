export default function MessagesIcon() {
	return (
		<svg
			width={50}
			height={50}
			viewBox='0 0 512 512'
			xmlns='http://www.w3.org/2000/svg'
			className='h-8 w-8 scale-110'
		>
			<defs>
				<linearGradient id='messagesGradient' x1='0%' y1='0%' x2='100%' y2='0%'>
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
						fill='url(#messagesGradient)'
						d='M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z'
					/>
				</g>
			</svg>
		</svg>
	);
}
