'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = 'system' } = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps['theme']}
			className='toaster group z-[999999]'
			richColors
			closeButton
			expand
			toastOptions={{
				style: {
					zIndex: 999999,
					borderRadius: '14px',
					padding: '12px 16px',
					fontSize: '13px',
					fontWeight: 500,
					boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.2), 0 4px 12px -2px rgba(0, 0, 0, 0.12)',
				},
				className:
					'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl',
			}}
			{...props}
		/>
	);
};

export { Toaster };
