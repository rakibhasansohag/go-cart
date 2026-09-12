import type { Metadata } from 'next';
import { getAdminHomepageSections, getHomepageStudioStats } from '@/queries/homepage-config';
import AdminHomepageClient from './_components/admin-homepage-client';

export const metadata: Metadata = {
	title: 'Homepage Layout Studio | GoCart Admin',
	description: 'Visually customize section order, visibility, and display parameters for the storefront homepage.',
	robots: { index: false, follow: false },
};

export default async function AdminHomepagePage() {
	const [initialSections, initialStats] = await Promise.all([
		getAdminHomepageSections(),
		getHomepageStudioStats(),
	]);

	return (
		<AdminHomepageClient
			initialSections={initialSections}
			initialStats={initialStats}
		/>
	);
}
