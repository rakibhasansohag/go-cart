import { ImageResponse } from 'next/og';

export const alt = 'GoCart - Multi-Vendor Marketplace';
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
	return new ImageResponse(
		(
			<div
				style={{
					fontSize: 60,
					background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
					color: 'white',
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					fontFamily: 'sans-serif',
					position: 'relative',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 20,
						marginBottom: 20,
					}}
				>
					<svg
						xmlns='http://www.w3.org/2000/svg'
						viewBox='0 0 24 24'
						width='90'
						height='90'
						fill='#10b981'
					>
						<path d='M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM7.16 14h9.68c.75 0 1.41-.41 1.75-1.03l3.58-6.49a1 1 0 0 0-.87-1.48H6.21L5.27 2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2z' />
					</svg>
					<span
						style={{
							fontSize: 80,
							fontWeight: 800,
							letterSpacing: '-2px',
							color: '#10b981',
						}}
					>
						GoCart
					</span>
				</div>
				<p
					style={{
						fontSize: 28,
						color: '#a1a1aa',
						maxWidth: 800,
						textAlign: 'center',
						margin: 0,
					}}
				>
					Multi-Vendor E-Commerce Marketplace
				</p>
			</div>
		),
		{
			...size,
		},
	);
}
