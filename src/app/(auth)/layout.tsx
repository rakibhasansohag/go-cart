import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AuthLayout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}
