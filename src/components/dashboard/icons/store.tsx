const StoreIcon = () => {
	return (
		<svg
			width={50}
			height={50}
			viewBox='0 0 512 512'
			xmlns='http://www.w3.org/2000/svg'
			className='h-8 w-8'
		>
			<defs>
				<linearGradient id='boxGradient' x1='0%' y1='0%' x2='100%' y2='0%'>
					<stop offset='0%' stopColor='#4275E4' />
					<stop offset='100%' stopColor='#A1BCF4' />
				</linearGradient>
			</defs>
			<svg
				width='100%'
				height='100%'
				viewBox='0 0 24 24'
				xmlns='http://www.w3.org/2000/svg'
			>
				<g>
					<path
						d='M21.999 8a.997.997 0 0 0-.143-.515L19.147 2.97A2.01 2.01 0 0 0 17.433 2H6.565c-.698 0-1.355.372-1.714.971L2.142 7.485A.997.997 0 0 0 1.999 8c0 1.005.386 1.914 1 2.618V20a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-5h4v5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-9.382c.614-.704 1-1.613 1-2.618zm-2.016.251A2.002 2.002 0 0 1 17.999 10c-1.103 0-2-.897-2-2c0-.068-.025-.128-.039-.192l.02-.004L15.219 4h2.214l2.55 4.251zm-9.977-.186L10.818 4h2.361l.813 4.065C13.957 9.138 13.079 10 11.999 10s-1.958-.862-1.993-1.935zM6.565 4h2.214l-.76 3.804l.02.004c-.015.064-.04.124-.04.192c0 1.103-.897 2-2 2a2.002 2.002 0 0 1-1.984-1.749L6.565 4zm3.434 12h-4v-3h4v3z'
						fill='url(#boxGradient)'
					/>
				</g>
			</svg>
		</svg>
	);
};

export default StoreIcon;
