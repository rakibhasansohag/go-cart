'use client';

import React, { ReactNode, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import ModalProvider from '@/providers/modal-provider';
import UploadPreloader from '@/providers/UploadProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/get-query-client';

interface Props {
	children: ReactNode;
}

export default function ClientProviders({ children }: Props) {
	const queryClient = getQueryClient();

	useEffect(() => {
		const countryCookie = document.cookie.includes('userCountry');
		if (!countryCookie) {
			fetch('/api/geo/country').catch(console.error);
		}
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
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
			{process.env.NODE_ENV === 'development' && (
				<ReactQueryDevtools initialIsOpen={false} />
			)}
		</QueryClientProvider>
	);
}
