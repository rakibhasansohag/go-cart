import type { Metadata } from 'next';

import MarketplaceStory from '@/components/demo/marketplace/marketplace-story';

export const metadata: Metadata = {
	title: 'Marketplace funds flow demo | GoCart',
	description:
		'Explore how GoCart protects buyers and gives sellers a clear path from sale to weekly payout.',
	};

export default function MarketplaceDemoPage() {
	return <MarketplaceStory />;
}
