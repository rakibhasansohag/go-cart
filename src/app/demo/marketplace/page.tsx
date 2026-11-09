import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/seo/page-metadata';

import MarketplaceStory from '@/components/demo/marketplace/marketplace-story';

export const metadata: Metadata = publicPageMetadata(
	'/demo/marketplace',
	'Marketplace Funds Flow Demo',
	'Explore how GoCart protects buyers and gives sellers a clear path from sale to weekly payout.',
);

export default function MarketplaceDemoPage() {
	return <MarketplaceStory />;
}
