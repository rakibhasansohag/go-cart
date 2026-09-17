import React from 'react';
import type { Metadata } from 'next';
import { DocsShell } from '@/components/docs/docs-shell';

export const metadata: Metadata = {
	title: {
		default: 'Documentation | GoCart Multi-Vendor Marketplace',
		template: '%s · GoCart Docs',
	},
	description:
		'Comprehensive guides, API references, vendor onboarding, and architectural documentation for the GoCart multi-vendor marketplace.',
	openGraph: {
		title: 'GoCart Documentation Hub',
		description: 'Complete guides and technical documentation for GoCart.',
		type: 'website',
		images: ['/og-image.png'],
	},
};

export default function DocumentationLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <DocsShell>{children}</DocsShell>;
}
