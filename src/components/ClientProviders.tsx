'use client';

import React, { ReactNode, useEffect } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import ModalProvider from '@/providers/modal-provider';
import UploadPreloader from '@/providers/UploadProvider';

interface Props {
	children: ReactNode;
}

export default function ClientProviders({ children }: Props) {
	useEffect(() => {
		const countryCookie = document.cookie.includes('userCountry');
		if (!countryCookie) {
			fetch('/api/geo/country').catch(console.error);
		}
	}, []);

	return (
		<ClerkProvider>
			<ThemeProvider
				attribute='class'
				defaultTheme='system'
				enableSystem
			>
				<ModalProvider>
					<main>{children}</main>
				</ModalProvider>
				<Toaster position='top-right' />
				<UploadPreloader
					key={process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET}
				/>
			</ThemeProvider>
		</ClerkProvider>
	);
}
