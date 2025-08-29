import { ReactNode } from 'react';

// Toaster
import { Toaster } from 'sonner';

export default function StoreLayout({ children }: { children: ReactNode }) {
	return (
		<div>
			<div>{children}</div>
			<Toaster position='top-center' />
		</div>
	);
}
