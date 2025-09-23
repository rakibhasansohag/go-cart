// Next.js
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Barlow } from 'next/font/google';


// Clerk Provider
import { ClerkProvider } from '@clerk/nextjs';

// Global css
import './globals.css';
import 'flag-icons/css/flag-icons.min.css';

// Theme Provider
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import ModalProvider from '../providers/modal-provider';
import UploadPreloader from '../providers/UploadProvider';

// Fonts
const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

const barlowFont = Barlow({
	variable: '--font-barlow',
	subsets: ['latin'],
	weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

// Metadata
export const metadata: Metadata = {
	title: 'GoCart | Multi-Vendor E-commerce Platform',
	description:
		'GoCart is a modern multi-vendor e-commerce platform where sellers can manage products and buyers can shop seamlessly. Built with Next.js and MySQL.',
	metadataBase: new URL('http://localhost:3000'),
	keywords: [
		'GoCart',
		'Multi Vendor Ecommerce',
		'Next.js Ecommerce',
		'MySQL Ecommerce',
		'Marketplace',
		'Online Shopping',
		'Vendor Dashboard',
	],
	authors: [
		{ name: 'Rakib Hasan Sohag', url: 'https://github.com/rakibhasansohag' },
	],
	creator: 'Rakib',
	openGraph: {
		title: 'GoCart | Multi-Vendor E-commerce',
		description:
			'A full-featured marketplace built with Next.js and MySQL. Shop or sell with ease on GoCart.',
		url: 'http://localhost:3000',
		siteName: 'GoCart',
		images: [
			{
				url: 'http://localhost:3000/og-image.png',
				width: 1200,
				height: 630,
				alt: 'GoCart Multi-Vendor Platform',
			},
		],
		type: 'website',
	},
	themeColor: '#10b981',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider afterSignOutUrl={'/'}>
			<html lang='en' suppressHydrationWarning>
				<head>
					<link rel='icon' type='image/svg+xml' href='/goCart.svg' />
				</head>
				<body
					className={`${geistSans.variable} ${geistMono.variable} antialiased ${barlowFont.variable} scroll-smooth antialiased`}
				>
					<ThemeProvider
						attribute='class'
						defaultTheme='system'
						enableSystem
						disableTransitionOnChange
					>
						{' '}
						<main>
							<ModalProvider>{children}</ModalProvider>
						</main>
						<Toaster position='top-right' />
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
