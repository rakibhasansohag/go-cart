import type { Metadata } from 'next';

export const metadata: Metadata = { alternates: { canonical: '/documentation/introduction' } };

import { redirect } from 'next/navigation';

export default function DocumentationRootPage() {
	redirect('/documentation/introduction');
}
