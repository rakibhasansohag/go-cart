import { ImageResponse } from 'next/og';

export const alt = 'GoCart - Multi-Vendor Marketplace';
export const size = {
	width: 1200,
	height: 630,
};
export const contentType = 'image/png';

const highlights = ['Independent stores', 'Secure checkout', 'Seller payouts'];

export default async function Image() {
	return new ImageResponse(
		(
			<div
				style={{
					background: 'radial-gradient(circle at 50% 0%, #064e3b 0%, #09090b 62%)',
					color: 'white',
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					fontFamily: 'sans-serif',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 32,
						marginBottom: 28,
					}}
				>
					<div
						style={{
							width: 132,
							height: 132,
							borderRadius: 31,
							background: 'linear-gradient(135deg, #34d399 0%, #059669 50%, #064e3b 100%)',
							border: '3px solid rgba(255, 255, 255, 0.18)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxShadow: '0 24px 60px rgba(16, 185, 129, 0.35)',
						}}
					>
						<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' width='132' height='132' fill='none'>
							<g transform='translate(2 -16)'>
								<path d='M112 148h40l38 170h172l34-122H163' stroke='#FFFFFF' strokeWidth='36' strokeLinecap='round' strokeLinejoin='round' />
								<path d='M264 234l26 23-26 23' stroke='#FFFFFF' strokeWidth='28' strokeLinecap='round' strokeLinejoin='round' />
								<circle cx='214' cy='384' r='30' fill='#FFFFFF' />
								<circle cx='338' cy='384' r='30' fill='#FFFFFF' />
							</g>
						</svg>
					</div>
					<div style={{ display: 'flex', fontSize: 112, fontWeight: 800, letterSpacing: '-4px' }}>
						<span style={{ color: '#f8fafc' }}>Go</span>
						<span style={{ color: '#34d399' }}>Cart</span>
					</div>
				</div>
				<p
					style={{
						fontSize: 34,
						color: '#d4d4d8',
						margin: 0,
					}}
				>
					Multi-Vendor E-Commerce Marketplace
				</p>
				<div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
					{highlights.map((label) => (
						<div
							key={label}
							style={{
								display: 'flex',
								fontSize: 24,
								color: '#a7f3d0',
								padding: '10px 22px',
								borderRadius: 999,
								border: '1px solid rgba(52, 211, 153, 0.35)',
								background: 'rgba(16, 185, 129, 0.12)',
							}}
						>
							{label}
						</div>
					))}
				</div>
			</div>
		),
		{
			...size,
		},
	);
}
