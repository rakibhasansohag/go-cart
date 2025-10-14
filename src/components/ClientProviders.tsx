'use client';

import React, { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import ModalProvider from '@/providers/modal-provider';
import UploadPreloader from '@/providers/UploadProvider';

interface Props {
	children: ReactNode;
}

export default function ClientProviders({ children }: Props) {
	return (
		<ClerkProvider>
			<ThemeProvider
				attribute='class'
				defaultTheme='system'
				enableSystem
				disableTransitionOnChange
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
