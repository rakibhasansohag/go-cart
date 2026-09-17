export interface DocHeading {
	id: string;
	title: string;
	level: 2 | 3;
}

export interface DocCallout {
	type: 'tip' | 'note' | 'important' | 'warning';
	title?: string;
	content: string;
}

export interface DocTable {
	headers: string[];
	rows: string[][];
	caption?: string;
}

export interface DocImage {
	src: string;
	alt: string;
	caption?: string;
}

export interface DocSection {
	id: string;
	title: string;
	content: string[];
	callout?: DocCallout;
	table?: DocTable;
	codeBlock?: {
		language: string;
		code: string;
		filename?: string;
	};
	image?: DocImage;
	subsections?: Array<{
		id: string;
		title: string;
		content: string[];
		codeBlock?: {
			language: string;
			code: string;
			filename?: string;
		};
	}>;
}

export interface DocArticle {
	slug: string;
	title: string;
	category: string;
	description: string;
	readTime: string;
	lastUpdated: string;
	headings: DocHeading[];
	intro: string;
	topCallout?: DocCallout;
	sections: DocSection[];
	tags: string[];
}

export interface DocCategory {
	id: string;
	title: string;
	icon: string;
	description: string;
	articles: {
		slug: string;
		title: string;
		description: string;
	}[];
}

export const DOCS_CATEGORIES: DocCategory[] = [
	{
		id: 'getting-started',
		title: 'Getting Started',
		icon: 'Rocket',
		description: 'Quick start guides, architecture overview, and platform setup.',
		articles: [
			{
				slug: 'introduction',
				title: 'Welcome to GoCart',
				description: 'Overview of the GoCart multi-vendor marketplace platform.',
			},
			{
				slug: 'quick-start',
				title: 'Quick Start & Demo Guide',
				description: '10-minute walkthrough with demo accounts and test workflows.',
			},
			{
				slug: 'architecture',
				title: 'Architecture & Data Models',
				description: 'Database schema, multi-tenant store isolation, and security principles.',
			},
		],
	},
	{
		id: 'buyer-experience',
		title: 'Buyer Experience',
		icon: 'ShoppingBag',
		description: 'Catalog browsing, cart splitting, checkout, coupons, and loyalty rewards.',
		articles: [
			{
				slug: 'storefront-shopping',
				title: 'Browsing & Smart Search',
				description: 'Catalog filtering, faceted search, category taxonomy, and stock visibility.',
			},
			{
				slug: 'cart-checkout',
				title: 'Cart, Coupons & Checkout',
				description: 'Multi-vendor order splitting, promo codes, Stripe & PayPal checkout.',
			},
			{
				slug: 'loyalty-rewards',
				title: 'Loyalty Coins & Daily Check-In',
				description: 'Daily login reward streaks, coin ledger, and coupon exchanges.',
			},
			{
				slug: 'order-tracking-returns',
				title: 'Orders, Tracking & Returns',
				description: 'Order timeline status transitions and multi-evidence return dispute flow.',
			},
		],
	},
	{
		id: 'seller-management',
		title: 'Seller & Vendor Hub',
		icon: 'Store',
		description: 'Store setup, multi-variant products, fulfillment, and automated payouts.',
		articles: [
			{
				slug: 'seller-onboarding',
				title: 'Storefront Setup & Branding',
				description: 'Store registration, logos, banners, announcement bars, and policy rules.',
			},
			{
				slug: 'product-management',
				title: 'Products, Variants & Inventory',
				description: 'Multi-variant sizes, colors, SKU generation, and stock management.',
			},
			{
				slug: 'order-fulfillment',
				title: 'Order Fulfillment & Shipments',
				description: 'Package splitting, tracking numbers, and fulfillment state machines.',
			},
			{
				slug: 'seller-payouts',
				title: 'Payouts & Stripe Connect',
				description: 'Automated commission deductions, escrow hold periods, and payout ledger.',
			},
		],
	},
	{
		id: 'admin-operations',
		title: 'Admin Control Center',
		icon: 'ShieldCheck',
		description: 'Platform configuration, store moderation, and dispute arbitration.',
		articles: [
			{
				slug: 'admin-operations',
				title: 'Platform Settings & Store Moderation',
				description: 'Commission fee sliders, vendor account moderation, and category management.',
			},
			{
				slug: 'fraud-disputes',
				title: 'Dispute Arbitration & Refunds',
				description: 'Reviewing return evidence, customer claims, and approving refunds.',
			},
		],
	},
	{
		id: 'developer-integrations',
		title: 'Developer & Integrations',
		icon: 'Code',
		description: 'Webhooks, real-time sync, idempotency guards, and SEO structured data.',
		articles: [
			{
				slug: 'api-webhooks',
				title: 'Webhooks & Idempotency',
				description: 'Stripe & PayPal webhook handlers, replay attack protection, and rate limiting.',
			},
			{
				slug: 'seo-metadata',
				title: 'SEO & Structured Data',
				description: 'Schema.org JSON-LD generation, dynamic sitemaps, and OpenGraph cards.',
			},
		],
	},
	{
		id: 'reference',
		title: 'Support & Reference',
		icon: 'HelpCircle',
		description: 'Frequently asked questions, troubleshooting, and platform changelog.',
		articles: [
			{
				slug: 'faq',
				title: 'Frequently Asked Questions',
				description: 'Common questions regarding buyers, sellers, payments, and admin roles.',
			},
			{
				slug: 'changelog',
				title: 'Platform Changelog',
				description: 'Recent feature releases, performance improvements, and fixes.',
			},
		],
	},
];

export const DOC_ARTICLES: Record<string, DocArticle> = {
	introduction: {
		slug: 'introduction',
		title: 'Welcome to GoCart',
		category: 'Getting Started',
		description: 'GoCart is a modern multi-vendor e-commerce platform where sellers manage storefronts and buyers shop seamlessly.',
		readTime: '4 min read',
		lastUpdated: 'September 2026',
		tags: ['introduction', 'overview', 'architecture', 'marketplace'],
		headings: [
			{ id: 'overview', title: 'Platform Overview', level: 2 },
			{ id: 'marketplace-model', title: 'Multi-Vendor Marketplace Model', level: 2 },
			{ id: 'tech-stack', title: 'Core Technology Stack', level: 2 },
			{ id: 'key-highlights', title: 'Key Platform Highlights', level: 2 },
			{ id: 'documentation-map', title: 'Documentation Sitemap', level: 2 },
		],
		intro: 'GoCart is a complete multi-vendor e-commerce platform built on Next.js 16 and PostgreSQL. It delivers distinct role-based experiences for buyers, independent store vendors, and marketplace platform administrators.',
		topCallout: {
			type: 'tip',
			title: 'Explore with Demo Accounts',
			content: 'You can test the entire platform without creating new accounts. Visit the Sign-In page to find one-click demo credentials for Admin, Seller, and Buyer roles.',
		},
		sections: [
			{
				id: 'overview',
				title: 'Platform Overview',
				content: [
					'GoCart connects multiple independent merchants under a unified e-commerce experience. Buyers can browse thousands of products across multiple sellers, add items from different stores into a unified cart, apply global and store coupons, and complete checkout in a single payment step.',
					'Behind the scenes, GoCart automatically splits multi-vendor orders into discrete store packages, handles individual vendor fulfillment, calculates platform commissions, and coordinates seller disbursements.',
				],
			},
			{
				id: 'marketplace-model',
				title: 'Multi-Vendor Marketplace Model',
				content: [
					'The marketplace operates on a three-tier architecture ensuring complete separation of concerns and robust data isolation between competing vendors:',
				],
				table: {
					headers: ['Role', 'Scope & Capabilities', 'Access Path'],
					rows: [
						['Buyer (Customer)', 'Search products, maintain wishlist, earn daily check-in coins, manage multi-vendor carts, place orders, and submit return requests with photo evidence.', '/, /browse, /cart, /profile'],
						['Seller (Vendor)', 'Manage private storefront branding, create multi-variant products, configure shipping matrices, process order packages, and track Stripe Connect payouts.', '/dashboard/seller/stores/[storeUrl]'],
						['Platform Administrator', 'Oversee marketplace operations, approve seller stores, adjust platform commission rates (default 2%), arbitrate return disputes, and audit financial settlements.', '/dashboard/admin'],
					],
				},
			},
			{
				id: 'tech-stack',
				title: 'Core Technology Stack',
				content: [
					'GoCart is built with industry-standard, production-ready technologies focusing on type safety, sub-second query performance, and SEO crawlability:',
				],
				table: {
					headers: ['Layer', 'Technology', 'Role in GoCart'],
					rows: [
						['Framework', 'Next.js 16 (App Router)', 'Server components, streaming SSR, parallel routes, and metadata optimization'],
						['Database & ORM', 'PostgreSQL + Prisma ORM', 'Relational database schema with strict constraints and automated migrations'],
						['Authentication', 'Clerk Auth', 'Multi-role authentication (ADMIN, SELLER, USER) with metadata role sync'],
						['Payments', 'Stripe Connect & PayPal SDK', 'Split payments, seller onboarding, webhooks, and automatic payouts'],
						['State & Query', 'TanStack Query v5 + Zustand', 'Server hydration, optimistic UI updates, and cached query invalidation'],
						['Styling & UI', 'Tailwind CSS + Radix UI', 'Accessible component primitives, dark/light theme toggle, responsive layout'],
					],
				},
			},
			{
				id: 'key-highlights',
				title: 'Key Platform Highlights',
				content: [
					'1. **Multi-Variant Product Engine**: Support for multiple colors, sizes, inventory stock tracking, SKU generation, and custom specifications.',
					'2. **Daily Check-In & Gamification**: Buyers earn loyalty coins through daily check-in streaks, redeemable for discount coupons.',
					'3. **Automated Payout Engine**: Platform commissions and seller payouts are tracked in real-time with configurable hold periods.',
					'4. **Multi-Evidence Return Pipeline**: Structured return request workflow with customer reason selection, image proof uploads, and vendor/admin dispute arbitration.',
					'5. **Platform-Wide SEO**: Schema.org JSON-LD structured data (Product, Store, WebSite, Breadcrumbs), dynamic sitemaps, and OpenGraph social cards.',
				],
			},
			{
				id: 'documentation-map',
				title: 'Documentation Sitemap',
				content: [
					'Navigate through the specialized sections using the left sidebar to learn more about specific features, configuration guides, and developer workflows.',
				],
			},
		],
	},

	'quick-start': {
		slug: 'quick-start',
		title: 'Quick Start & Demo Guide',
		category: 'Getting Started',
		description: 'Get up and running with GoCart in under 5 minutes using pre-configured demo workflows.',
		readTime: '5 min read',
		lastUpdated: 'September 2026',
		tags: ['quickstart', 'demo', 'setup', 'tutorial'],
		headings: [
			{ id: 'prerequisites', title: 'Prerequisites & Setup', level: 2 },
			{ id: 'demo-accounts', title: 'Pre-Seeded Demo Accounts', level: 2 },
			{ id: 'buyer-walkthrough', title: 'Step 1: Buyer Shopping Flow', level: 2 },
			{ id: 'seller-walkthrough', title: 'Step 2: Seller Storefront Flow', level: 2 },
			{ id: 'admin-walkthrough', title: 'Step 3: Admin Operations Flow', level: 2 },
		],
		intro: 'This quick start guide takes you through the full GoCart workflow—from browsing products and checking out as a buyer, to managing inventory and fulfilling packages as a seller, and moderating stores as an administrator.',
		topCallout: {
			type: 'note',
			title: 'Local Development Server',
			content: 'The application runs locally on http://localhost:3000. All mock checkout and demo flows are safe to test in sandbox mode.',
		},
		sections: [
			{
				id: 'prerequisites',
				title: 'Prerequisites & Setup',
				content: [
					'To run GoCart locally, ensure you have the following installed:',
					'- **Node.js 20+** or **Bun runtime**',
					'- **PostgreSQL database** (local or hosted on Neon / Supabase)',
					'- Configured environment variables for Clerk, Stripe, and Database URL',
				],
				codeBlock: {
					language: 'bash',
					filename: 'Terminal',
					code: '# Install dependencies\nbun install\n\n# Run migrations and generate Prisma client\nbun run db:prepare\n\n# Seed test catalog and demo stores\nbun run db:seed:demo\n\n# Start the local development server\nbun run dev',
				},
			},
			{
				id: 'demo-accounts',
				title: 'Pre-Seeded Demo Accounts',
				content: [
					'GoCart includes one-click demo credentials accessible directly on the `/sign-in` page:',
				],
				table: {
					headers: ['Role', 'Demo Email', 'Capabilities'],
					rows: [
						['Admin', 'admin@gocart.com', 'Access full platform control panel at /dashboard/admin'],
						['Seller', 'seller@gocart.com', 'Manage store "GoCart Demo Store" at /dashboard/seller'],
						['Buyer', 'buyer@gocart.com', 'Browse catalog, earn loyalty coins, and checkout at /cart'],
					],
				},
			},
			{
				id: 'buyer-walkthrough',
				title: 'Step 1: Buyer Shopping Flow',
				content: [
					'1. Navigate to `/browse` to explore the catalog.',
					'2. Use the sidebar filters to refine by Category, Color, Size, and Price Range.',
					'3. Open any product page (e.g., `/product/gocart-demo-product-20`) to select color/size variants.',
					'4. Click **Add to Cart** and visit `/cart` to review shipping fee calculations and apply test coupons.',
					'5. Complete checkout using test card credentials.',
				],
			},
			{
				id: 'seller-walkthrough',
				title: 'Step 2: Seller Storefront Flow',
				content: [
					'1. Sign in with the Seller account and open `/dashboard/seller`.',
					'2. Click **Products → New Product** to create a product with multiple sizes, SKU codes, and images.',
					'3. Open **Orders** to inspect new incoming order groups.',
					'4. Transition order status from `PENDING` → `PROCESSING` → `SHIPPED` with tracking numbers.',
				],
			},
			{
				id: 'admin-walkthrough',
				title: 'Step 3: Admin Operations Flow',
				content: [
					'1. Open `/dashboard/admin` to view marketplace GMV metrics and vendor statistics.',
					'2. Adjust global commission rates under **Settings**.',
					'3. Review pending store applications and approve or suspend vendor stores.',
				],
			},
		],
	},

	architecture: {
		slug: 'architecture',
		title: 'Architecture & Data Models',
		category: 'Getting Started',
		description: 'Deep dive into GoCart database entities, multi-tenant isolation, and request security.',
		readTime: '6 min read',
		lastUpdated: 'September 2026',
		tags: ['architecture', 'database', 'prisma', 'security'],
		headings: [
			{ id: 'entity-model', title: 'Core Relational Schema', level: 2 },
			{ id: 'tenant-isolation', title: 'Multi-Tenant Store Isolation', level: 2 },
			{ id: 'order-lifecycle', title: 'Order & Package Splitting Model', level: 2 },
			{ id: 'security-guards', title: 'Request Security & Guardrails', level: 2 },
		],
		intro: 'GoCart is engineered around a clean PostgreSQL schema managed via Prisma ORM, enforcing strict foreign key constraints, tenant isolation, and audit trails.',
		sections: [
			{
				id: 'entity-model',
				title: 'Core Relational Schema',
				content: [
					'The data model is structured around core marketplace relationships:',
					'- **User**: Core entity linked to Clerk identity, holding role (`USER`, `SELLER`, `ADMIN`) and account status.',
					'- **Store**: Vendor business entity owning products, shipping policies, and linked to a `SellerPaymentAccount`.',
					'- **Product & ProductVariant**: Products hold root metadata, while `ProductVariant` models specific SKU, color, size, price, and stock combinations.',
					'- **Order & OrderGroup**: The root `Order` represents the buyer payment transaction, while individual `OrderGroup` records represent distinct vendor packages.',
				],
			},
			{
				id: 'tenant-isolation',
				title: 'Multi-Tenant Store Isolation',
				content: [
					'To protect vendor business data and prevent cross-tenant tampering, all seller queries enforce strict database-level owner filters (`where: { store: { userId: currentUserId } }`).',
					'Store URL slugs and email addresses are immutable after store creation, preventing store impersonation.',
				],
				callout: {
					type: 'important',
					title: 'Security Rule',
					content: 'No vendor API or server action can read, modify, or cancel orders belonging to a different store. Violations throw explicit unauthenticated/unauthorized errors and log security audit events.',
				},
			},
			{
				id: 'order-lifecycle',
				title: 'Order & Package Splitting Model',
				content: [
					'When a buyer checks out with items from Store A and Store B:',
					'1. Single `Order` is created for payment capture ($250 total).',
					'2. Two independent `OrderGroup` packages are generated: Package A ($150) and Package B ($100).',
					'3. Each store manages their package fulfillment independently without seeing the other store items.',
				],
			},
			{
				id: 'security-guards',
				title: 'Request Security & Guardrails',
				content: [
					'GoCart implements comprehensive security guardrails across mutation endpoints:',
					'- **CSRF & Origin Verification**: Browser mutations verify same-origin headers.',
					'- **Rate Limiting**: Sliding window rate limits via `RateLimitBucket` model.',
					'- **Content Sanitization**: Jodit rich-text descriptions sanitized with `sanitize-html` and `dompurify`.',
					'- **Webhook Idempotency**: Stripe and PayPal webhooks verify cryptographic signatures and record processed event IDs.',
				],
			},
		],
	},

	'storefront-shopping': {
		slug: 'storefront-shopping',
		title: 'Browsing & Smart Search',
		category: 'Buyer Experience',
		description: 'Catalog browsing, full-text faceted filtering, category navigation, and live inventory.',
		readTime: '4 min read',
		lastUpdated: 'September 2026',
		tags: ['catalog', 'search', 'filters', 'browse'],
		headings: [
			{ id: 'browse-catalog', title: 'Catalog Navigation', level: 2 },
			{ id: 'faceted-filters', title: 'Faceted Filtering Engine', level: 2 },
			{ id: 'smart-search', title: 'Search Query Processing', level: 2 },
			{ id: 'product-details', title: 'Product Details & Variant Selection', level: 2 },
		],
		intro: 'GoCart provides a responsive catalog browsing experience with multi-faceted filtering, instant search, and real-time inventory calculation.',
		sections: [
			{
				id: 'browse-catalog',
				title: 'Catalog Navigation',
				content: [
					'The `/browse` page provides instant access to all published marketplace products. Buyers can sort items by Popularity, Newest Arrivals, Price (Low to High), and Price (High to Low).',
					'Category headers on the storefront allow quick one-click filtering to subcategories like Watches, Shirts, Electronics, and Gaming gear.',
				],
			},
			{
				id: 'faceted-filters',
				title: 'Faceted Filtering Engine',
				content: [
					'The filter sidebar computes available facets dynamically based on current inventory:',
					'- **Price Range Slider**: Min and Max bounds computed dynamically from active inventory.',
					'- **Color Selector**: Swatch picker displaying matching color variants with hex previews.',
					'- **Size Matrix**: Multi-select size pills with instant product count badges.',
					'- **Special Offers**: Deals filter for Flash Sales, Super Deals, and Free Shipping items.',
				],
			},
			{
				id: 'smart-search',
				title: 'Search Query Processing',
				content: [
					'Search queries match against product titles, descriptions, brand names, and variant SKU codes using case-insensitive PostgreSQL ILIKE queries.',
					'Search URLs update cleanly to `/browse?search=term`, preserving browser history and allowing easy bookmarking.',
				],
			},
			{
				id: 'product-details',
				title: 'Product Details & Variant Selection',
				content: [
					'On the product page (`/product/[slug]`):',
					'- Interactive image gallery with thumbnail preview and zoom lens.',
					'- Real-time price updating when switching between variant sizes and discounted promotional sale rates.',
					'- Verified buyer review breakdown with 5-star rating distribution and helpfulness voting.',
					'- Community Q&A accordion where buyers ask questions answered by verified store owners.',
				],
			},
		],
	},

	'cart-checkout': {
		slug: 'cart-checkout',
		title: 'Cart, Coupons & Checkout',
		category: 'Buyer Experience',
		description: 'Multi-vendor cart grouping, coupon calculations, shipping estimation, and payment processing.',
		readTime: '5 min read',
		lastUpdated: 'September 2026',
		tags: ['cart', 'checkout', 'stripe', 'paypal', 'coupons'],
		headings: [
			{ id: 'cart-architecture', title: 'Cart Architecture & Storage', level: 2 },
			{ id: 'coupon-discounts', title: 'Coupon Validation Rules', level: 2 },
			{ id: 'shipping-calculation', title: 'Multi-Store Shipping Calculation', level: 2 },
			{ id: 'payment-methods', title: 'Stripe & PayPal Integration', level: 2 },
		],
		intro: 'The GoCart cart engine groups items by vendor store, calculates international shipping fees, applies personal and store coupons, and orchestrates secure split payments.',
		sections: [
			{
				id: 'cart-architecture',
				title: 'Cart Architecture & Storage',
				content: [
					'Cart items are synchronized to the buyer account database when signed in, and persisted to `localStorage` for guest visitors.',
					'When items from multiple sellers are present, the cart summary displays transparent per-store subtotals and individual estimated delivery date ranges.',
				],
			},
			{
				id: 'coupon-discounts',
				title: 'Coupon Validation Rules',
				content: [
					'GoCart supports two distinct coupon types:',
					'1. **Platform Coupons**: Applicable across all stores, funded by marketplace promotions.',
					'2. **Store-Specific Coupons**: Created by individual vendors for their storefront items.',
					'Coupons validate active date windows, maximum global uses, and per-user usage limits before deduction.',
				],
			},
			{
				id: 'shipping-calculation',
				title: 'Multi-Store Shipping Calculation',
				content: [
					'Shipping rates are calculated per store using three flexible rate strategies:',
					'- **Per-Item Rate**: Flat base fee + increment per additional item.',
					'- **Weight-Based Rate**: Scaled rate based on total variant package weight (kg).',
					'- **Fixed Flat Rate**: Single fixed delivery fee per order group regardless of quantity.',
				],
			},
			{
				id: 'payment-methods',
				title: 'Stripe & PayPal Integration',
				content: [
					'GoCart supports direct credit/debit card processing via Stripe Elements and one-click PayPal Smart Buttons.',
					'Payment authorization triggers atomic database transactions that reserve inventory stock, record payment records, and spawn seller fulfillment tasks.',
				],
			},
		],
	},

	'loyalty-rewards': {
		slug: 'loyalty-rewards',
		title: 'Loyalty Coins & Daily Check-In',
		category: 'Buyer Experience',
		description: 'Gamified buyer retention with streak tracking, coin balances, and reward coupon exchanges.',
		readTime: '4 min read',
		lastUpdated: 'September 2026',
		tags: ['loyalty', 'gamification', 'checkin', 'coins'],
		headings: [
			{ id: 'checkin-mechanics', title: 'Daily Check-In Mechanics', level: 2 },
			{ id: 'streak-bonuses', title: 'Streak Milestones & Rewards', level: 2 },
			{ id: 'coin-ledger', title: 'Coin Balance & Transaction History', level: 2 },
			{ id: 'reward-exchange', title: 'Redeeming Coins for Coupons', level: 2 },
		],
		intro: 'GoCart includes a built-in gamification engine that rewards buyers for daily visits with loyalty coins that can be exchanged for exclusive discount coupons.',
		sections: [
			{
				id: 'checkin-mechanics',
				title: 'Daily Check-In Mechanics',
				content: [
					'Buyers can check in once per calendar day (UTC) via the header check-in modal. Consecutive check-ins build a monthly streak that unlocks escalating coin bonuses.',
					'Database constraints (`@@unique([userId, date])`) guarantee that each user can only earn one check-in reward per day.',
				],
			},
			{
				id: 'streak-bonuses',
				title: 'Streak Milestones & Rewards',
				content: [
					'Daily check-ins award standard coins with special mystery boxes on milestone days:',
				],
				table: {
					headers: ['Day Streak', 'Coins Awarded', 'Special Bonus'],
					rows: [
						['Day 1 - 6', '10 - 30 Coins', 'Standard daily claim'],
						['Day 7 (Milestone)', '100 Coins', '7-Day Streak Badge + 5% Off Coupon'],
						['Day 14 (Milestone)', '250 Coins', '14-Day Streak Badge + Free Shipping Coupon'],
						['Day 30 (Milestone)', '500 Coins', 'Monthly Champion Badge + $20 Store Coupon'],
					],
				},
			},
			{
				id: 'coin-ledger',
				title: 'Coin Balance & Transaction History',
				content: [
					'The buyer loyalty dashboard at `/profile/loyalty` displays total lifetime coins, current redeemable balance, and an itemized audit ledger of earned and spent coins.',
				],
			},
			{
				id: 'reward-exchange',
				title: 'Redeeming Coins for Coupons',
				content: [
					'Buyers can exchange accumulated coins for personalized coupons directly within the check-in modal or profile page. The redeemed coupon code is automatically added to the buyer checkout wallet.',
				],
			},
		],
	},

	'order-tracking-returns': {
		slug: 'order-tracking-returns',
		title: 'Orders, Tracking & Returns',
		category: 'Buyer Experience',
		description: 'Order status lifecycle, package tracking, delivery confirmation, and return dispute resolution.',
		readTime: '5 min read',
		lastUpdated: 'September 2026',
		tags: ['orders', 'returns', 'disputes', 'tracking'],
		headings: [
			{ id: 'order-lifecycle', title: 'Order Status Lifecycle', level: 2 },
			{ id: 'tracking-packages', title: 'Real-Time Package Tracking', level: 2 },
			{ id: 'return-pipeline', title: 'Multi-Evidence Return Pipeline', level: 2 },
			{ id: 'resolution-refunds', title: 'Resolution & Refund Issuance', level: 2 },
		],
		intro: 'GoCart provides transparent order status tracking from placement to delivery, alongside a structured return pipeline with multi-photo evidence submission.',
		sections: [
			{
				id: 'order-lifecycle',
				title: 'Order Status Lifecycle',
				content: [
					'Order groups progress through defined state transitions:',
					'- **PENDING**: Order placed, waiting for store fulfillment acknowledgment.',
					'- **PROCESSING**: Store is picking, packing, and preparing shipment.',
					'- **SHIPPED**: Package handed to carrier with active tracking number.',
					'- **DELIVERED**: Carrier confirmed delivery to buyer shipping address.',
					'- **CANCELLED**: Order cancelled prior to shipment with automated refund.',
				],
			},
			{
				id: 'tracking-packages',
				title: 'Real-Time Package Tracking',
				content: [
					'Buyers can view individual store packages at `/profile/orders`. Each package shows carrier details (FedEx, DHL, USPS), tracking code, and an estimated delivery timeline.',
				],
			},
			{
				id: 'return-pipeline',
				title: 'Multi-Evidence Return Pipeline',
				content: [
					'Within the store return window (default 7 days after delivery), buyers can initiate a return request by:',
					'1. Selecting specific items and quantities to return.',
					'2. Choosing a return reason (e.g. Defective, Wrong Item, Damaged Package).',
					'3. Uploading photographic evidence of the item and shipping label.',
					'4. Submitting a detailed explanation for store review.',
				],
			},
			{
				id: 'resolution-refunds',
				title: 'Resolution & Refund Issuance',
				content: [
					'Store owners can approve the return, request additional photos, or decline with a reason. If approved, refunds are processed automatically back to the original payment method.',
					'In case of disagreement, platform administrators can intervene via the Admin Dispute Arbitration console.',
				],
			},
		],
	},

	'seller-onboarding': {
		slug: 'seller-onboarding',
		title: 'Storefront Setup & Branding',
		category: 'Seller & Vendor Hub',
		description: 'Creating a store, customizing logos and banners, configuring announcements and return policies.',
		readTime: '4 min read',
		lastUpdated: 'September 2026',
		tags: ['seller', 'store', 'branding', 'settings'],
		headings: [
			{ id: 'store-registration', title: 'Registering a New Store', level: 2 },
			{ id: 'branding-customization', title: 'Store Branding & Banners', level: 2 },
			{ id: 'announcement-bar', title: 'Top Announcement Bar', level: 2 },
			{ id: 'shipping-policies', title: 'Shipping & Return Policies', level: 2 },
		],
		intro: 'Vendors can launch personalized storefronts on GoCart with custom branding, announcement banners, social links, and granular return policies.',
		sections: [
			{
				id: 'store-registration',
				title: 'Registering a New Store',
				content: [
					'Any authenticated user can apply to become a seller. Store registration requires:',
					'- **Store Name & Unique URL Slug**: Chosen URL becomes the public storefront link (`/store/[slug]`).',
					'- **Contact Information**: Support email and business phone number.',
					'- **Business Description**: Public description visible on the store header and search cards.',
				],
			},
			{
				id: 'branding-customization',
				title: 'Store Branding & Banners',
				content: [
					'Sellers customize their storefront appearance via `/dashboard/seller/stores/[storeUrl]/settings`:',
					'- **Logo**: Displayed across product cards, store header, and invoice headers.',
					'- **Cover Banner (1200x400)**: Hero banner displayed on top of the vendor store page.',
					'- **Social Media Links**: Direct links to Instagram, Facebook, Twitter, YouTube, and TikTok.',
				],
			},
			{
				id: 'announcement-bar',
				title: 'Top Announcement Bar',
				content: [
					'Sellers can activate an announcement bar displayed across all their product pages to advertise flash discounts, holiday shipping deadlines, or seasonal sales.',
				],
			},
			{
				id: 'shipping-policies',
				title: 'Shipping & Return Policies',
				content: [
					'Configure default delivery window ranges (min/max days), return acceptance toggle, return window period (7 to 30 days), and customer return shipping fee rules.',
				],
			},
		],
	},

	'product-management': {
		slug: 'product-management',
		title: 'Products, Variants & Inventory',
		category: 'Seller & Vendor Hub',
		description: 'Creating multi-variant products, managing SKUs, size charts, color swatches, and low stock alerts.',
		readTime: '6 min read',
		lastUpdated: 'September 2026',
		tags: ['products', 'variants', 'inventory', 'sku'],
		headings: [
			{ id: 'product-creation', title: 'Creating Products', level: 2 },
			{ id: 'variant-hierarchy', title: 'Variant Structure (Colors & Sizes)', level: 2 },
			{ id: 'inventory-tracking', title: 'Inventory Stock & Low-Stock Alerts', level: 2 },
			{ id: 'specifications-faq', title: 'Product Specs & Custom FAQs', level: 2 },
		],
		intro: 'GoCart features a multi-tiered product and variant management system allowing sellers to create rich catalogs with multi-image color swatches and individual size stock.',
		sections: [
			{
				id: 'product-creation',
				title: 'Creating Products',
				content: [
					'To create a new product, navigate to `/dashboard/seller/stores/[storeUrl]/products/new`:',
					'1. Enter Product Title, Brand, Description (with rich text formatting), and Category taxonomy.',
					'2. Choose a Shipping Fee calculation strategy (Item, Weight, or Fixed).',
					'3. Add custom product specifications (e.g. Material: Ceramic, Dimensions: 10x15cm).',
				],
			},
			{
				id: 'variant-hierarchy',
				title: 'Variant Structure (Colors & Sizes)',
				content: [
					'GoCart uses a hierarchical variant model:',
					'- **Color Variant**: Holds dedicated gallery images, variant description, keywords, and unique slug.',
					'- **Size Option**: Belongs to a color variant and defines specific Size label, Price, Discount percentage, and available Quantity.',
				],
				table: {
					headers: ['Attribute', 'Level', 'Example Value'],
					rows: [
						['Brand & Category', 'Root Product', 'Nike · Footwear / Running Shoes'],
						['Color & Gallery', 'Product Variant', 'Midnight Blue (4 high-res photos)'],
						['Size, Price & Stock', 'Size Entity', 'US 10 · $149.99 · 25 units in stock · SKU: NK-RN-BLU-10'],
					],
				},
			},
			{
				id: 'inventory-tracking',
				title: 'Inventory Stock & Low-Stock Alerts',
				content: [
					'When buyers place orders, quantity is automatically decremented. If stock drops below the configured `lowStockThreshold` (default 5 units), visual warning badges alert the vendor in their inventory dashboard.',
				],
			},
			{
				id: 'specifications-faq',
				title: 'Product Specs & Custom FAQs',
				content: [
					'Vendors can add custom technical specifications and pre-answered FAQs to answer common buyer questions, reducing support overhead.',
				],
			},
		],
	},

	'order-fulfillment': {
		slug: 'order-fulfillment',
		title: 'Order Fulfillment & Shipments',
		category: 'Seller & Vendor Hub',
		description: 'Managing incoming orders, printing packing slips, assigning carrier tracking, and status transitions.',
		readTime: '4 min read',
		lastUpdated: 'September 2026',
		tags: ['fulfillment', 'orders', 'shipping', 'packages'],
		headings: [
			{ id: 'incoming-orders', title: 'Managing Incoming Orders', level: 2 },
			{ id: 'package-assignment', title: 'Package Assignment & Tracking', level: 2 },
			{ id: 'bulk-actions', title: 'Bulk Fulfillment Actions', level: 2 },
			{ id: 'invoices-packing', title: 'Invoices & PDF Packing Slips', level: 2 },
		],
		intro: 'The seller order fulfillment dashboard gives merchants full control over order processing, shipping labels, and carrier tracking updates.',
		sections: [
			{
				id: 'incoming-orders',
				title: 'Managing Incoming Orders',
				content: [
					'Vendors view pending order groups at `/dashboard/seller/stores/[storeUrl]/orders`. Orders display buyer shipping destination, purchased variants, item quantities, and gross totals.',
				],
			},
			{
				id: 'package-assignment',
				title: 'Package Assignment & Tracking',
				content: [
					'When an order is ready for dispatch, click **Fulfill Package** to input:',
					'- Carrier Name (e.g., DHL Express, FedEx, USPS)',
					'- Tracking Code / Airway Bill Number',
					'- Estimated Arrival Date',
					'Saving transitions status to `SHIPPED` and dispatches automated delivery notification emails to the customer.',
				],
			},
			{
				id: 'bulk-actions',
				title: 'Bulk Fulfillment Actions',
				content: [
					'Merchants processing high volume can select multiple orders to execute batch status updates (e.g. Move 20 orders to `PROCESSING` simultaneously).',
				],
			},
			{
				id: 'invoices-packing',
				title: 'Invoices & PDF Packing Slips',
				content: [
					'One-click PDF invoice generation allows sellers to download and print formatted packing slips with barcode references and customer shipping addresses.',
				],
			},
		],
	},

	'seller-payouts': {
		slug: 'seller-payouts',
		title: 'Payouts & Stripe Connect',
		category: 'Seller & Vendor Hub',
		description: 'Connecting Stripe Express accounts, understanding settlement hold periods, and payout ledger audits.',
		readTime: '5 min read',
		lastUpdated: 'September 2026',
		tags: ['payouts', 'stripe', 'finance', 'settlement'],
		headings: [
			{ id: 'stripe-connect', title: 'Stripe Connect Onboarding', level: 2 },
			{ id: 'commission-calculation', title: 'Platform Commission & Net Earnings', level: 2 },
			{ id: 'settlement-hold', title: 'Settlement Hold Period (Escrow)', level: 2 },
			{ id: 'payout-ledger', title: 'Payout History & Ledger', level: 2 },
		],
		intro: 'GoCart uses Stripe Connect to automate vendor onboarding, commission calculations, and direct bank payouts while protecting buyers through structured escrow hold periods.',
		sections: [
			{
				id: 'stripe-connect',
				title: 'Stripe Connect Onboarding',
				content: [
					'Vendors connect their bank account via Stripe Express on `/dashboard/seller/stores/[storeUrl]/payouts`. Stripe handles KYC identity verification and bank account verification.',
				],
			},
			{
				id: 'commission-calculation',
				title: 'Platform Commission & Net Earnings',
				content: [
					'For every successful sale, GoCart automatically deducts the platform commission fee (configurable by admin, default 2%). The remaining 98% is credited to the seller pending settlement balance.',
				],
				table: {
					headers: ['Gross Order Group', 'Platform Commission (2%)', 'Net Seller Credit'],
					rows: [
						['$100.00', '$2.00', '$98.00'],
						['$250.00', '$5.00', '$245.00'],
						['$1,000.00', '$20.00', '$980.00'],
					],
				},
			},
			{
				id: 'settlement-hold',
				title: 'Settlement Hold Period (Escrow)',
				content: [
					'To allow sufficient time for return windows and buyer claims, earnings remain in `PENDING` status for a configurable hold period (default 7 days after delivery). Once the hold expires, funds automatically transfer to `AVAILABLE` balance for payout.',
				],
			},
			{
				id: 'payout-ledger',
				title: 'Payout History & Ledger',
				content: [
					'Vendors can review every historical transfer, payout arrival date, currency breakdown, and bank account destination in their payout history ledger.',
				],
			},
		],
	},

	'admin-operations': {
		slug: 'admin-operations',
		title: 'Platform Settings & Store Moderation',
		category: 'Admin Control Center',
		description: 'Managing platform fee rates, approving new stores, category management, and audit logs.',
		readTime: '4 min read',
		lastUpdated: 'September 2026',
		tags: ['admin', 'moderation', 'settings', 'categories'],
		headings: [
			{ id: 'admin-dashboard', title: 'Admin Control Overview', level: 2 },
			{ id: 'platform-settings', title: 'Commission & Escrow Settings', level: 2 },
			{ id: 'store-moderation', title: 'Vendor & Store Moderation', level: 2 },
			{ id: 'category-management', title: 'Marketplace Categories Taxonomy', level: 2 },
		],
		intro: 'Platform administrators possess marketplace-wide governance tools to regulate commission percentages, approve or suspend vendor stores, and maintain product taxonomy.',
		sections: [
			{
				id: 'admin-dashboard',
				title: 'Admin Control Overview',
				content: [
					'The admin dashboard at `/dashboard/admin` displays key marketplace metrics: Gross Merchandise Volume (GMV), active vendor counts, total orders, and open customer return disputes.',
				],
			},
			{
				id: 'platform-settings',
				title: 'Commission & Escrow Settings',
				content: [
					'Administrators can update global marketplace parameters at `/dashboard/admin/settings`:',
					'- **Commission Percentage**: Platform fee rate applied to all vendor sales (1% to 15%).',
					'- **Payout Hold Days**: Minimum days before seller settlement funds mature for transfer (3 to 30 days).',
				],
			},
			{
				id: 'store-moderation',
				title: 'Vendor & Store Moderation',
				content: [
					'Under `/dashboard/admin/stores`, admins can inspect new seller applications and set store status:',
					'- **ACTIVE**: Store is approved and public across catalog.',
					'- **PENDING**: Store undergoing review before public listing.',
					'- **SUSPENDED**: Store temporarily hidden due to policy violations or disputes.',
				],
			},
			{
				id: 'category-management',
				title: 'Marketplace Categories Taxonomy',
				content: [
					'Admins create and organize categories and subcategories with custom icon URLs and promotional banners under `/dashboard/admin/categories`.',
				],
			},
		],
	},

	'fraud-disputes': {
		slug: 'fraud-disputes',
		title: 'Dispute Arbitration & Refunds',
		category: 'Admin Control Center',
		description: 'Reviewing customer return evidence, vendor responses, arbitrating disputes, and enforcing refunds.',
		readTime: '4 min read',
		lastUpdated: 'September 2026',
		tags: ['disputes', 'refunds', 'arbitration', 'fraud'],
		headings: [
			{ id: 'dispute-queue', title: 'Open Dispute Queue', level: 2 },
			{ id: 'evidence-review', title: 'Evidence & Photo Verification', level: 2 },
			{ id: 'arbitration-actions', title: 'Arbitration Decisions', level: 2 },
		],
		intro: 'When buyers and sellers cannot agree on a return or refund request, GoCart administrators step in to review evidence and make binding dispute decisions.',
		sections: [
			{
				id: 'dispute-queue',
				title: 'Open Dispute Queue',
				content: [
					'Disputed return requests appear in `/dashboard/admin/disputes` with status, timestamp, claim amounts, and involved parties.',
				],
			},
			{
				id: 'evidence-review',
				title: 'Evidence & Photo Verification',
				content: [
					'The dispute detail view compiles the entire timeline: initial order items, buyer return reasons, submitted evidence photos, and vendor response logs.',
				],
			},
			{
				id: 'arbitration-actions',
				title: 'Arbitration Decisions',
				content: [
					'Administrators can take two decisive actions:',
					'1. **Approve Refund**: Triggers direct Stripe/PayPal refund reversal back to customer, adjusting seller settlement balance.',
					'2. **Reject Claim**: Closes the dispute in favor of the vendor with an audit reason recorded.',
				],
			},
		],
	},

	'api-webhooks': {
		slug: 'api-webhooks',
		title: 'Webhooks & Idempotency',
		category: 'Developer & Integrations',
		description: 'Stripe and PayPal webhook integration, cryptographic signature validation, and replay attack protection.',
		readTime: '5 min read',
		lastUpdated: 'September 2026',
		tags: ['webhooks', 'stripe', 'paypal', 'security', 'api'],
		headings: [
			{ id: 'webhook-endpoints', title: 'Configured Webhook Endpoints', level: 2 },
			{ id: 'signature-verification', title: 'Cryptographic Signature Verification', level: 2 },
			{ id: 'idempotency-guards', title: 'Idempotent Replay Attack Protection', level: 2 },
			{ id: 'event-catalog', title: 'Supported Webhook Events', level: 2 },
		],
		intro: 'GoCart receives real-time payment and payout notifications from Stripe and PayPal through secure, idempotent webhook handlers.',
		sections: [
			{
				id: 'webhook-endpoints',
				title: 'Configured Webhook Endpoints',
				content: [
					'GoCart exposes dedicated public endpoints for payment provider events:',
					'- **Stripe**: `/api/webhooks/stripe`',
					'- **PayPal**: `/api/webhooks/paypal`',
				],
			},
			{
				id: 'signature-verification',
				title: 'Cryptographic Signature Verification',
				content: [
					'Every incoming request payload is verified against the provider webhook secret before execution. Invalid signatures are rejected immediately with HTTP 400.',
				],
				codeBlock: {
					language: 'typescript',
					filename: 'src/app/api/webhooks/stripe/route.ts',
					code: '// Verify Stripe cryptographic signature\nconst event = stripe.webhooks.constructEvent(\n  rawBody,\n  signature,\n  process.env.STRIPE_WEBHOOK_SECRET!\n);',
				},
			},
			{
				id: 'idempotency-guards',
				title: 'Idempotent Replay Attack Protection',
				content: [
					'To prevent duplicate balance credits or multiple order creations from network retries, processed event IDs are recorded in `SellerPaymentAccountEvent`. Repeated events return HTTP 200 without executing side effects twice.',
				],
			},
			{
				id: 'event-catalog',
				title: 'Supported Webhook Events',
				content: [
					'- `payment_intent.succeeded`: Marks order paid, reserves stock, creates order groups.',
					'- `charge.refunded`: Updates return request status and adjusts settlement ledger.',
					'- `account.updated`: Synchronizes seller Stripe Express onboarding and payout capability.',
					'- `payout.paid` / `payout.failed`: Records disbursement confirmation.',
				],
			},
		],
	},

	'seo-metadata': {
		slug: 'seo-metadata',
		title: 'SEO & Structured Data',
		category: 'Developer & Integrations',
		description: 'Schema.org JSON-LD structured data generators, dynamic sitemaps, robots.txt, and OpenGraph preview cards.',
		readTime: '4 min read',
		lastUpdated: 'September 2026',
		tags: ['seo', 'schema', 'sitemap', 'opengraph'],
		headings: [
			{ id: 'schema-engine', title: 'Schema.org JSON-LD Generator Engine', level: 2 },
			{ id: 'dynamic-sitemap', title: 'Dynamic XML Sitemap & Robots', level: 2 },
			{ id: 'opengraph-cards', title: 'Dynamic Social Preview Cards', level: 2 },
		],
		intro: 'GoCart is optimized for search engines and social sharing, implementing Schema.org structured data, dynamic XML sitemaps, and OpenGraph previews across all pages.',
		sections: [
			{
				id: 'schema-engine',
				title: 'Schema.org JSON-LD Generator Engine',
				content: [
					'The type-safe generator located at `src/lib/seo/schema.ts` outputs standardized Schema.org payloads:',
					'- **Product**: Includes product name, description, SKU, brand, offers with price and availability (`InStock`), seller metadata, and aggregate reviews.',
					'- **Store**: Outputs local business metadata with contact email, telephone, and logo.',
					'- **BreadcrumbList**: Standard navigation trail linking Home → Category → Product.',
					'- **WebSite & Organization**: Root platform metadata with `SearchAction` deep-linking.',
				],
			},
			{
				id: 'dynamic-sitemap',
				title: 'Dynamic XML Sitemap & Robots',
				content: [
					'Next.js dynamic routes automatically generate `/sitemap.xml` and `/robots.txt`:',
					'- `src/app/sitemap.ts`: Indexes all active products, stores, categories, and static endpoints.',
					'- `src/app/robots.ts`: Allows public storefront paths while disallowing private dashboard routes.',
				],
			},
			{
				id: 'opengraph-cards',
				title: 'Dynamic Social Preview Cards',
				content: [
					'Using Next.js `ImageResponse` in `src/app/opengraph-image.tsx`, social platforms (Facebook, Twitter, LinkedIn, Slack) render dynamic 1200x630 preview banners when links are shared.',
				],
			},
		],
	},

	faq: {
		slug: 'faq',
		title: 'Frequently Asked Questions',
		category: 'Support & Reference',
		description: 'Answers to the most common questions from buyers, sellers, and developers.',
		readTime: '4 min read',
		lastUpdated: 'September 2026',
		tags: ['faq', 'help', 'support', 'questions'],
		headings: [
			{ id: 'buyer-faq', title: 'Buyer Questions', level: 2 },
			{ id: 'seller-faq', title: 'Seller Questions', level: 2 },
			{ id: 'tech-faq', title: 'Developer & Technical Questions', level: 2 },
		],
		intro: 'Find answers to frequently asked questions about shopping, selling, order fulfillment, and platform setup on GoCart.',
		sections: [
			{
				id: 'buyer-faq',
				title: 'Buyer Questions',
				content: [
					'**Q: Can I buy items from multiple stores in a single checkout?**  \nYes. GoCart allows adding items from multiple stores to your cart. During checkout, you pay once and your order is split into separate store shipments with individual tracking numbers.',
					'**Q: How do I submit a return request?**  \nGo to `/profile/orders`, click on your delivered order, choose **Request Return**, select the items and reason, upload photos, and submit for vendor review.',
					'**Q: How do loyalty coins work?**  \nEarn coins by checking in daily. Accumulated coins can be redeemed for store and platform discount coupons in your account dashboard.',
				],
			},
			{
				id: 'seller-faq',
				title: 'Seller Questions',
				content: [
					'**Q: How do I get paid for my sales?**  \nConnect your bank account via Stripe Express under your seller settings. After the order hold period (7 days after delivery) expires, your net earnings transfer directly to your bank account.',
					'**Q: What is the marketplace commission rate?**  \nGoCart charges a standard platform fee (default 2%) deducted automatically upon payment capture.',
				],
			},
			{
				id: 'tech-faq',
				title: 'Developer & Technical Questions',
				content: [
					'**Q: How do I reset or seed the demo database?**  \nRun `bun run db:seed:demo` to populate products, categories, demo users, and active stores.',
					'**Q: How are unit and integration tests executed?**  \nRun `bun vitest run` to execute the full test suite across auth, payments, calculations, and security guards.',
				],
			},
		],
	},

	changelog: {
		slug: 'changelog',
		title: 'Platform Changelog',
		category: 'Support & Reference',
		description: 'Chronological release notes and recent platform updates.',
		readTime: '3 min read',
		lastUpdated: 'September 2026',
		tags: ['changelog', 'releases', 'updates', 'version'],
		headings: [
			{ id: 'version-1-0-0', title: 'Version 1.0.0 (September 2026)', level: 2 },
		],
		intro: 'Track the latest features, architectural enhancements, and fixes deployed to the GoCart multi-vendor marketplace platform.',
		sections: [
			{
				id: 'version-1-0-0',
				title: 'Version 1.0.0 (September 2026)',
				content: [
					'### Initial Stable Marketplace Release',
					'- **Multi-Vendor Architecture**: Complete multi-tenant store isolation and dynamic sub-storefront pages.',
					'- **Comprehensive Documentation Hub**: Interactive documentation center with live search, table of contents, and role guides.',
					'- **Platform-Wide SEO**: Schema.org JSON-LD generation (`Product`, `Store`, `BreadcrumbList`, `WebSite`, `Organization`), dynamic sitemaps, and robots.txt.',
					'- **Gamified Loyalty System**: Daily check-in streaks with mystery boxes and coin-to-coupon exchanges.',
					'- **Payment & Escrow Engine**: Stripe Connect integration, PayPal SDK, and automated settlement calculation.',
					'- **Multi-Evidence Return Pipeline**: Structured return request flow with customer photo evidence uploads.',
				],
			},
		],
	},
};

export const getAllDocSlugs = (): string[] => {
	return Object.keys(DOC_ARTICLES);
};

export const getDocArticleBySlug = (slug: string): DocArticle | undefined => {
	return DOC_ARTICLES[slug];
};

export const getAdjacentDocArticles = (
	currentSlug: string,
): { prev?: { slug: string; title: string }; next?: { slug: string; title: string } } => {
	const allArticles: { slug: string; title: string }[] = [];
	for (const cat of DOCS_CATEGORIES) {
		for (const art of cat.articles) {
			allArticles.push({ slug: art.slug, title: art.title });
		}
	}

	const index = allArticles.findIndex((a) => a.slug === currentSlug);
	if (index === -1) return {};

	return {
		prev: index > 0 ? allArticles[index - 1] : undefined,
		next: index < allArticles.length - 1 ? allArticles[index + 1] : undefined,
	};
};
