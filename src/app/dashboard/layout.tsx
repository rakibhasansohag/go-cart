import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
	return (
		<div>
			<ThemeProvider
				attribute='class'
				defaultTheme='light'
				enableSystem
				disableTransitionOnChange
			>
				{children}
			</ThemeProvider>
		</div>
	);
}
