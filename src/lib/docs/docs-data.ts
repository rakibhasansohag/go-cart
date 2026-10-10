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

type GuideInput = Omit<DocArticle, 'headings' | 'readTime' | 'lastUpdated'>;

function guide(input: GuideInput): DocArticle {
	return {
		...input,
		readTime: '2 min read',
		lastUpdated: 'October 5, 2026',
		headings: input.sections.map(section => ({ id: section.id, title: section.title, level: 2 })),
	};
}

export const DOC_ARTICLES: Record<string, DocArticle> = {
	introduction: guide({
		slug: 'introduction', title: 'Welcome to GoCart', category: 'Getting Started',
		description: 'Choose a demo account and learn what customers, sellers and admins can do.',
		intro: 'GoCart is a shopping website with several independent stores. Customers buy products, sellers manage their stores, and admins look after the marketplace.',
		tags: ['welcome', 'demo', 'login', 'customer', 'seller', 'admin'],
		sections: [
			{ id: 'start-here', title: 'Start here', content: [
				'You do not need to install anything to try the website. Use a demo account, or create your own account from [Sign up](/sign-up).',
				'For a short tour, open [Try the demo](/documentation/quick-start). To shop without signing in, visit the [storefront](/).',
			] },
			{ id: 'choose-your-role', title: 'Choose what you want to try', content: [], table: {
				headers: ['Role', 'What you can do', 'Start with'], rows: [
					['Customer', 'Shop, checkout, track orders and request returns.', 'Shopping and checkout'],
					['Seller', 'Edit your store, add products and manage orders.', 'Setting up a store'],
					['Admin', 'Review stores, returns and marketplace totals.', 'Using the admin dashboard'],
				],
			} },
			{ id: 'find-help', title: 'Find the right guide', content: [
				'Use the menu to pick a topic. On a phone, tap the menu button at the top. Search the guides if you know what you need help with.',
				'Each guide explains where to go, what to do and what happens next. Developer pages explain how the website works; they are optional for customers and sellers.',
			] },
		],
	}),
	'quick-start': guide({
		slug: 'quick-start', title: 'Try the Demo', category: 'Getting Started',
		description: 'Sign in and try shopping, store management or the admin dashboard.',
		intro: 'Pick one role to start. You can explore the other roles later by signing out and using a different demo account.',
		tags: ['demo', 'login', 'password', 'quick start', 'test payment'],
		sections: [
			{ id: 'customer-tour', title: 'Try shopping as a customer', content: [
				'1. Sign in with the Customer account shown above.',
				'2. Open the [storefront](/), choose a product, pick a size or option and add it to your cart.',
				'3. Open [Cart](/cart). Change the quantity or remove an item. Check the total before checkout.',
				'4. At checkout, choose an address and an available payment method. For a Stripe sandbox checkout, use the test card below.',
				'5. After payment is confirmed, open [My orders](/profile/orders) to see the order.',
			], table: { headers: ['Stripe test field', 'Enter this'], rows: [
				['Card number', '4242 4242 4242 4242'], ['Expiry date', 'Any future date'], ['CVC', 'Any three digits'], ['Postal code, if asked', 'Any valid postal code'],
			], caption: 'Use this card only when checkout is configured for Stripe test mode. It does not make a real payment.' } },
			{ id: 'seller-tour', title: 'Try managing a store', content: [
				'1. Sign out, then sign in with the Seller account.',
				'2. Open the [seller dashboard](/dashboard/seller) and choose a store.',
				'3. Open Products to view a product, or Orders to view the store’s packages.',
				'4. Read [Managing products and stock](/documentation/product-management) before editing sample data.',
			] },
			{ id: 'admin-tour', title: 'Try the admin dashboard', content: [
				'1. Sign out, then sign in with the Admin account.',
				'2. Open the [admin dashboard](/dashboard/admin). Review the totals and charts.',
				'3. Open Stores, Orders or Returns to see what admins can manage.',
				'4. Read [Using the admin dashboard](/documentation/admin-operations) for the meaning of each total.',
			] },
		],
	}),
	architecture: guide({
		slug: 'architecture', title: 'How GoCart Works', category: 'Getting Started',
		description: 'A short explanation of accounts, stores, orders and background work.',
		intro: 'This page is for people who want to understand the project. You can use the website without knowing these details.', tags: ['developer', 'architecture', 'database', 'roles'],
		sections: [
			{ id: 'roles-and-stores', title: 'Accounts and stores', content: [
				'An account has a Customer, Seller or Admin role. Sellers manage the stores they own. Admins manage the marketplace.',
				'A product belongs to a store. Its options, such as colors and sizes, have their own stock quantities.',
			] },
			{ id: 'orders-and-packages', title: 'One checkout, separate store packages', content: [
				'If you buy from two stores, checkout creates one order for your payment and a separate package for each store.',
				'For example, a $50 item from Store A and a $30 item from Store B appear in one checkout, but each seller handles their own package. Shipping and discounts affect the final total.',
			] },
			{ id: 'behind-the-scenes', title: 'What happens behind the scenes', content: [
				'Next.js displays the website. PostgreSQL stores the data, and Prisma helps the application read and update it. Clerk handles sign-in.',
				'Payment providers send signed messages to confirm payment changes. Background jobs handle work such as notifications, emails and reminders. Repeated messages are checked to avoid repeating the same business action.',
			] },
		],
	}),
	'storefront-shopping': guide({
		slug: 'storefront-shopping', title: 'Finding Products', category: 'For Customers',
		description: 'Search for products, use filters and browse a store one page at a time.',
		intro: 'You can browse products before signing in. Sign in when you want to save favorites or place an order.', tags: ['search', 'filters', 'pagination', 'wishlist'],
		sections: [
			{ id: 'search', title: 'Search and filter', content: [
				'Use the search box at the top, or open [Browse](/browse). Enter a product name or browse a category.',
				'Use the available filters to narrow the results. Change the sort order to compare prices or find other matches.',
			] },
			{ id: 'store-pages', title: 'Browse a store', content: [
				'Open [Browse stores](/stores) to see how many active stores are available, search for a store and read its profile. You can also open a store from a product page. A store with many products shows page controls below its product list.',
				'Use Next and Previous to move between pages. Changing a filter starts the results from the first page.',
			] },
			{ id: 'product-options', title: 'Check the product before buying', content: [
				'Read the description and choose the size, color or other option you want. Check the displayed price and available stock.',
				'Use the heart button to save a product to your wishlist. If you need more information, ask a question on the product page.',
			] },
		],
	}),
	'cart-checkout': guide({
		slug: 'cart-checkout', title: 'Cart, Coupons and Checkout', category: 'For Customers',
		description: 'Review your cart, apply a coupon and place an order.',
		intro: 'You can buy products from different stores in one checkout. Review the final total before paying.', tags: ['cart', 'coupon', 'checkout', 'payment'],
		sections: [
			{ id: 'review-cart', title: 'Review your cart', content: [
				'Open [Cart](/cart). Check the selected product options and quantities. Remove items you no longer want.',
				'Items are grouped by store. Shipping costs can differ between stores, so check both shipping and the final total.',
			] },
			{ id: 'apply-coupon', title: 'Use a coupon', content: [
				'Enter a coupon code and apply it. A coupon may have an expiry date, minimum spend or usage limit.',
				'Check that the discount appears in your total. A coupon used in one checkout counts as one redemption even when the checkout includes several stores.',
			] },
			{ id: 'pay-and-confirm', title: 'Pay and confirm', content: [
				'Choose your shipping address and an available payment method. Follow the payment form and wait for confirmation.',
				'Open [My orders](/profile/orders) after payment. An order can contain separate store packages with different shipping progress.',
				'If confirmation is unclear, check the order’s payment status before trying another payment.',
			] },
		],
	}),
	'loyalty-rewards': guide({
		slug: 'loyalty-rewards', title: 'GoCoins and Daily Rewards', category: 'For Customers',
		description: 'Find your GoCoins balance, claim daily rewards and use available rewards.',
		intro: 'GoCoins are reward points in GoCart. Your rewards page shows your balance and the rewards you can use.', tags: ['coins', 'rewards', 'check-in', 'loyalty'],
		sections: [
			{ id: 'check-balance', title: 'Find your balance', content: ['Sign in and open [Rewards](/profile/rewards). You can see your balance and the history of coins added or used.'] },
			{ id: 'claim-rewards', title: 'Claim daily rewards', content: ['Open the daily check-in calendar and claim the available reward. The calendar shows which days you have already claimed.', 'Paid orders may also earn coins. Check your reward history to see the recorded amount.'] },
			{ id: 'use-coins', title: 'Use your coins', content: ['Choose an available reward or discount and check how many coins it costs.', 'Refunds can adjust coins earned from an order. Your rewards history records those changes.'] },
		],
	}),
	'order-tracking-returns': guide({
		slug: 'order-tracking-returns', title: 'Orders, Delivery and Returns', category: 'For Customers',
		description: 'Check an order, follow its delivery progress and request a return.',
		intro: 'Payment status and delivery status are different. An order can be paid while its store packages are still being prepared.', tags: ['orders', 'tracking', 'returns', 'refunds'],
		sections: [
			{ id: 'find-order', title: 'Find your order', content: ['Open [My orders](/profile/orders) and choose the order. Check its payment status, store packages and delivery information.', 'If several stores are involved, each package can move at a different speed.'] },
			{ id: 'request-return', title: 'Request a return', content: ['Open [Returns](/profile/returns), start a return request and select an eligible order or item.', 'Choose a reason, explain the problem and add any requested evidence. Submit the request and follow its status in Returns.', 'Eligibility depends on the store’s policy and the item’s delivery date.'] },
			{ id: 'refund-status', title: 'What happens next?', content: ['The seller or admin reviews the request. A submitted request does not automatically approve a refund.', 'Check the request for the decision and any return instructions. A confirmed refund is recorded separately from the return request.'] },
		],
	}),
	'seller-onboarding': guide({
		slug: 'seller-onboarding', title: 'Setting Up a Store', category: 'For Sellers',
		description: 'Create a store and add its name, images, shipping details and return policy.',
		intro: 'A store is where you sell your products. The Seller demo account already has sample stores to explore.', tags: ['seller', 'store', 'branding', 'shipping'],
		sections: [
			{ id: 'open-dashboard', title: 'Open the seller dashboard', content: ['Sign in as a seller and open the [seller dashboard](/dashboard/seller). Choose an existing store or use the new-store option.', 'If your account is not a seller account, start from [Become a seller](/seller/apply).'] },
			{ id: 'store-details', title: 'Add store details', content: ['Enter the store name, contact details and description. Add a logo and cover image, then save.', 'Your store URL is the address customers use to visit your store. Review the preview and saved details. New stores may need admin approval before appearing publicly.'] },
			{ id: 'store-policies', title: 'Set shipping and return information', content: ['Open the store’s Shipping and Settings pages. Set the available shipping costs and delivery estimates.', 'Write a clear return policy so customers know which items can be returned and how long they have to request a return.'] },
		],
	}),
	'product-management': guide({
		slug: 'product-management', title: 'Managing Products and Stock', category: 'For Sellers',
		description: 'Add a product, upload photos and set prices and stock for each option.',
		intro: 'Choose your store before editing products. Each size or option can have its own price and stock.', tags: ['products', 'upload', 'images', 'variants', 'inventory'],
		sections: [
			{ id: 'add-product', title: 'Add or edit a product', content: ['Open your store’s Products page and choose the new-product option, or open an existing product to edit it.', 'Add a clear name, category and description. Use Upload images to add photos, fill the required fields and save.', 'Open the saved product on the storefront to check the description and photos.'] },
			{ id: 'product-options', title: 'Add sizes and other options', content: ['A variant is one version of a product, such as a color. Sizes belong to that version.', 'For example, a blue shirt can have Small and Medium sizes. Set the price and stock for each size.', 'A SKU is a code that identifies a particular item or option. It helps you distinguish stock records.'] },
			{ id: 'update-stock', title: 'Keep stock up to date', content: ['Open Inventory or the product’s stock fields. Check the correct size or option before changing its quantity.', 'Orders reserve stock, so the available quantity can change after checkout. Low-stock notifications help you decide when to restock.'] },
		],
	}),
	'order-fulfillment': guide({
		slug: 'order-fulfillment', title: 'Preparing and Sending Orders', category: 'For Sellers',
		description: 'Find paid packages and update their preparation and delivery information.',
		intro: 'Your order workspace shows the packages for your store. Payment confirmation and package preparation are separate steps.', tags: ['seller', 'orders', 'packages', 'shipping', 'packing slip'],
		sections: [
			{ id: 'review-orders', title: 'Review incoming orders', content: ['Open your store’s Orders page and choose a package. Check that payment is confirmed, then review its items and quantities.', 'A customer’s checkout may include other stores. You manage only your store’s package.'] },
			{ id: 'prepare-package', title: 'Update preparation progress', content: ['Use the available package actions as you accept, prepare and hand off the items. Only allowed next actions appear.', 'Use the packing slip where available to check the items going into the package.'] },
			{ id: 'delivery-progress', title: 'Follow delivery progress', content: ['Add or review shipment and tracking information in the order workspace. Shipment progress can differ from the package preparation status.', 'Some sample orders use demo automation to show progress over time. This is a demonstration, not proof of a real shipment.'] },
		],
	}),
	'seller-payouts': guide({
		slug: 'seller-payouts', title: 'Understanding Seller Earnings', category: 'For Sellers',
		description: 'Understand sales, commission, money on hold and payouts.',
		intro: 'A paid order does not mean money is ready to be paid out immediately. The earnings page shows the current status.', tags: ['earnings', 'commission', 'settlements', 'payout', 'Stripe Connect'],
		sections: [
			{ id: 'earnings-terms', title: 'What the amounts mean', content: [], table: { headers: ['Term', 'Meaning'], rows: [
				['Sales', 'The recorded value of your orders.'], ['Commission', 'The marketplace fee charged to the seller.'], ['Settlement', 'The record of how much is owed to the seller for a package.'], ['On hold or blocked', 'Money that is not yet eligible for release, or needs review.'], ['Payout', 'Money sent by the payment provider to the seller’s bank account.'],
			] } },
			{ id: 'view-earnings', title: 'Check your earnings', content: ['Open your store’s Earnings page. Review the amount, status and any explanation of a hold or block.', 'Refunds, disputes, fees and payout-account requirements can affect the amount available.'] },
			{ id: 'payment-account', title: 'Connect a payout account', content: ['Use the Stripe Connect setup from your seller workspace and follow the provider’s instructions.', 'Account requirements and marketplace release rules must be met before payouts can happen. Sandbox balances and payouts are demonstrations, not real earnings.'] },
		],
	}),
	'admin-operations': guide({
		slug: 'admin-operations', title: 'Using the Admin Dashboard', category: 'For Admins',
		description: 'Read the marketplace totals and review stores, orders and background jobs.',
		intro: 'Sign in as an admin and open the admin dashboard. Start with the totals, then open the relevant management page.', tags: ['admin', 'GMV', 'revenue', 'stores', 'background jobs'],
		sections: [
			{ id: 'dashboard-totals', title: 'What the totals mean', content: [], table: { headers: ['Dashboard label', 'Plain meaning'], rows: [
				['GMV', 'Gross merchandise value: the value of paid and partially refunded order groups included in the dashboard. It is not platform profit.'],
				['Platform revenue', 'Recorded seller commission. It is not profit after operating costs.'],
				['Paid order groups', 'Paid or partially refunded store packages. One checkout can create several groups.'],
				['Active stores', 'Stores currently active. This is a current count, not a historical monthly count.'],
				['Risk signals', 'Returns, disputes or settlement problems that may need review.'],
			] } },
			{ id: 'manage-marketplace', title: 'Manage the marketplace', content: ['Use Stores to review store applications and status. Use Categories to organize products, and Settings to review marketplace options.', 'Use Orders and Returns to investigate a specific purchase or request. Review the details before changing its status.'] },
			{ id: 'background-jobs', title: 'Check background jobs', content: ['Open [Background jobs](/dashboard/admin/background-jobs) to see queued work such as emails and notifications.', 'A failed job needs investigation. After the cause is fixed, an admin can replay eligible failed work. A successful replay should not repeat the same business effect.'] },
		],
	}),
	'fraud-disputes': guide({
		slug: 'fraud-disputes', title: 'Reviewing Returns and Refunds', category: 'For Admins',
		description: 'Review a return request, its evidence and the actions available to an admin.',
		intro: 'Review the order, the customer’s explanation and the seller’s response before making a decision.', tags: ['admin', 'returns', 'refunds', 'disputes'],
		sections: [
			{ id: 'open-request', title: 'Open the request', content: ['Open [Admin returns](/dashboard/admin/returns) and select a request. Check its current status, requested amount and deadlines.', 'Compare the request with the paid order and the items involved.'] },
			{ id: 'review-evidence', title: 'Read the evidence', content: ['Read the customer’s reason and notes. Review uploaded photos and the seller’s response.', 'Use the available review actions and explain the decision clearly. A deadline reminder asks for review; it does not automatically approve a refund.'] },
			{ id: 'refund-confirmation', title: 'Check the result', content: ['A return decision and a completed refund are separate records. Check the refund status after an approved financial action.', 'If the provider has not confirmed success, investigate the recorded status rather than assuming the money was returned.'] },
		],
	}),
	'api-webhooks': guide({
		slug: 'api-webhooks', title: 'Payment Updates and Background Jobs', category: 'For Developers',
		description: 'Understand provider messages, duplicate checks and queued work.',
		intro: 'This developer guide explains why payment updates and notifications can arrive at different times.', tags: ['developer', 'webhooks', 'queue', 'idempotency', 'recovery'],
		sections: [
			{ id: 'payment-messages', title: 'Payment providers send updates', content: ['A webhook is a message sent by a payment provider when something changes, such as a payment succeeding.', 'GoCart checks the provider’s signature before accepting it. Payment handlers update the matching order using the provider event and payment identifiers.'] },
			{ id: 'duplicates', title: 'The same message can arrive twice', content: ['Providers and queues may deliver a message more than once. Idempotency means processing it again does not repeat the same business action.', 'GoCart records event identifiers and business-action keys so a repeated payment message does not earn coins or create the same notification again.'] },
			{ id: 'queued-work', title: 'Work can retry later', content: ['A durable job is saved in the database before delivery is attempted. The worker claims it, performs the work and records the result.', 'Failures retry with longer waits. Work that reaches the attempt limit becomes DEAD and creates an admin alert. Recovery and admin replay help resume eligible work after the cause is fixed.'] },
		],
	}),
	'seo-metadata': guide({
		slug: 'seo-metadata', title: 'Search Results and Shared Links', category: 'For Developers',
		description: 'Understand page titles, search information and social link previews.',
		intro: 'GoCart gives public pages information that search engines and social apps can read. Each service decides when and how to display it.', tags: ['SEO', 'sharing', 'preview', 'metadata', 'sitemap'],
		sections: [
			{ id: 'search-information', title: 'What search engines read', content: ['Public pages include a title, description and preferred page URL. Structured data describes information such as a product and its price in a format search engines understand.', 'The sitemap lists public pages. Having this information does not guarantee a search ranking or an enhanced search result.'] },
			{ id: 'sharing-links', title: 'Share a page', content: ['Use the Share button or copy the product, store or home-page URL.', 'Social apps read preview information such as the title and image. The image must be publicly accessible.'] },
			{ id: 'preview-troubleshooting', title: 'If a preview is missing or old', content: ['Check that the URL opens without signing in and that its preview image loads.', 'Social apps can cache an older preview. Their inspection tools may refresh it. A valid page does not guarantee every app updates its preview immediately.'] },
		],
	}),
	faq: guide({
		slug: 'faq', title: 'Common Questions', category: 'Help',
		description: 'Quick answers about demo logins, orders, store access and refunds.',
		intro: 'Start here if you are unsure what to do next.', tags: ['help', 'FAQ', 'login', 'password', 'payment'],
		sections: [
			{ id: 'login-help', title: 'How do I sign in or switch roles?', content: ['The demo emails and passwords are shown in [Try the demo](/documentation/quick-start) and on [Sign in](/sign-in).', 'To switch roles, sign out first. Sign in again with the Customer, Seller or Admin demo account you want to use.'] },
			{ id: 'order-help', title: 'Why is my paid order still pending?', content: ['Paid means the payment was confirmed. Pending can mean the store has not started preparing its package yet.', 'Open the order and check both payment and package status. See [Orders, delivery and returns](/documentation/order-tracking-returns).'] },
			{ id: 'access-help', title: 'Why can’t I open a dashboard or store?', content: ['Check which account you signed in with. Customers cannot open the admin dashboard, and sellers manage only stores they own.', 'Use the matching demo account, then open its dashboard. A missing or unavailable store may also need review by an admin.'] },
			{ id: 'return-help', title: 'Does a return request guarantee a refund?', content: ['No. The seller or admin reviews the request first. Check the decision and refund status in your Returns page.'] },
		],
	}),
	changelog: guide({
		slug: 'changelog', title: 'What You Can Explore', category: 'Help',
		description: 'A short checklist of the features available in the GoCart demo.',
		intro: 'Use this checklist to choose a part of the demo to explore. Provider-dependent features require their configured services.', tags: ['features', 'demo', 'overview'],
		sections: [
			{ id: 'customer-features', title: 'Customer features', content: ['- Product search, filters, store pages and pagination.', '- Cart, coupons, checkout and order details.', '- Wishlists, GoCoins, daily check-in, questions and returns.'] },
			{ id: 'seller-features', title: 'Seller features', content: ['- Store details, images, shipping and return policies.', '- Product descriptions, uploaded photos, sizes, prices and stock.', '- Store orders, preparation progress, return requests and earnings.'] },
			{ id: 'admin-features', title: 'Admin features', content: ['- Marketplace totals, store review, categories and settings.', '- Order and return review, settlement records and background-job recovery.', 'Start with [Try the demo](/documentation/quick-start) to explore these features using the shared accounts.'] },
		],
	}),
};

const CATEGORY_INFO = [
	{ id: 'getting-started', title: 'Getting Started', icon: 'Rocket', description: 'Choose an account and take a short tour.' },
	{ id: 'buyer-experience', title: 'For Customers', icon: 'ShoppingBag', description: 'Find products, pay for orders and request returns.' },
	{ id: 'seller-management', title: 'For Sellers', icon: 'Store', description: 'Manage a store, its products, orders and earnings.' },
	{ id: 'admin-operations', title: 'For Admins', icon: 'ShieldCheck', description: 'Review the marketplace and understand its totals.' },
	{ id: 'developer-integrations', title: 'For Developers', icon: 'Code', description: 'Understand payment updates, background work and sharing.' },
	{ id: 'reference', title: 'Help', icon: 'HelpCircle', description: 'Find quick answers and features to explore.' },
];

export const DOCS_CATEGORIES: DocCategory[] = CATEGORY_INFO.map(category => ({
	...category,
	articles: Object.values(DOC_ARTICLES).filter(article => article.category === category.title)
		.map(({ slug, title, description }) => ({ slug, title, description })),
}));

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
