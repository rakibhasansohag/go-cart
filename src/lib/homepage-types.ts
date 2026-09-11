export type HomepageSectionKey =
	| 'HERO_GRID'
	| 'SUPER_DEALS'
	| 'FEATURED_CATEGORIES'
	| 'MORE_TO_LOVE';

export interface HomepageSectionConfig {
	countdownEnd?: string;
	badge?: string;
	itemsLimit?: number;
	showSideAd?: boolean;
	showUserCard?: boolean;
	[key: string]: unknown;
}

export interface HomepageSectionItem {
	id: string;
	sectionKey: HomepageSectionKey;
	name: string;
	title: string | null;
	subtitle: string | null;
	isActive: boolean;
	order: number;
	config: HomepageSectionConfig | null;
	updatedAt: Date;
}

export const DEFAULT_HOMEPAGE_SECTIONS: Omit<HomepageSectionItem, 'id' | 'updatedAt'>[] = [
	{
		sectionKey: 'HERO_GRID',
		name: 'Hero Banner & Features',
		title: 'Featured Highlights',
		subtitle: 'Top picks and daily deals',
		isActive: true,
		order: 1,
		config: { showSideAd: true, showUserCard: true },
	},
	{
		sectionKey: 'SUPER_DEALS',
		name: 'Super Deals Hub',
		title: 'Super Deals',
		subtitle: 'Limited-time discounts on top products',
		isActive: true,
		order: 2,
		config: { badge: 'Flash Sale', itemsLimit: 10 },
	},
	{
		sectionKey: 'FEATURED_CATEGORIES',
		name: 'Featured Categories',
		title: 'Featured Categories',
		subtitle: 'Explore top trending collections',
		isActive: true,
		order: 3,
		config: { itemsLimit: 8 },
	},
	{
		sectionKey: 'MORE_TO_LOVE',
		name: 'More to Love Products',
		title: 'More to Love',
		subtitle: 'Curated recommendations for you',
		isActive: true,
		order: 4,
		config: { itemsLimit: 18 },
	},
];
