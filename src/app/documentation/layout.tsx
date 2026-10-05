import React from 'react';
import type { Metadata } from 'next';
import { DocsShell } from '@/components/docs/docs-shell';

export const metadata: Metadata = {
	title: {
		default: 'Documentation | GoCart Multi-Vendor Marketplace',
		template: '%s · GoCart Docs',
	},
	description:
		'Simple guides for shopping, managing a store and using the GoCart admin dashboard. Includes demo login accounts.',
	openGraph: {
		title: 'GoCart Documentation Hub',
		description: 'Learn how to use GoCart with short guides and demo accounts.',
		type: 'website',
		images: ['/opengraph-image'],
	},
};

export default function DocumentationLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <DocsShell>{children}</DocsShell>;
}
