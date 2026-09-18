/**
 * seed-centralized-catalog.ts
 *
 * Centralized marketplace catalog seeder for GoCart.
 * - Seeds 24 curated products across 6 modern categories under active store `srank`.
 * - Uploads at least 5 semantically connected high-resolution images per product to Cloudinary.
 * - Automatically caches uploaded Cloudinary URLs to prevent redundant network calls.
 * - Seeds realistic sizes, inventory, specifications, and customer reviews.
 *
 * Usage:
 *   bun prisma/seed-centralized-catalog.ts
 */

import { PrismaClient, ShippingFeeMethod, StoreStatus, Role } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';

const db = new PrismaClient();

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET;
const CACHE_FILE = path.join(__dirname, '.cloudinary-image-cache.json');

// Local cache to avoid re-uploading identical images to Cloudinary on script re-runs
let imageCache: Record<string, string> = {};
if (fs.existsSync(CACHE_FILE)) {
	try {
		imageCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
	} catch {
		imageCache = {};
	}
}

function saveCache() {
	try {
		fs.writeFileSync(CACHE_FILE, JSON.stringify(imageCache, null, 2));
	} catch (err) {
		console.warn('Could not save image cache file:', err);
	}
}

async function uploadToCloudinary(sourceUrl: string, publicIdHint: string): Promise<string> {
	if (imageCache[publicIdHint]) {
		return imageCache[publicIdHint];
	}

	if (!CLOUD_NAME || !CLOUD_PRESET) {
		// Fallback directly to the high-res CDN source if Cloudinary environment is unset
		return sourceUrl;
	}

	const formData = new FormData();
	formData.append('file', sourceUrl);
	formData.append('upload_preset', CLOUD_PRESET);
	formData.append('folder', 'go-cart-ecommerce/products');
	formData.append('public_id', publicIdHint);

	const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
		method: 'POST',
		body: formData,
	});

	if (!response.ok) {
		console.warn(`Cloudinary upload failed for ${publicIdHint}, falling back to source URL.`);
		return sourceUrl;
	}

	const data = (await response.json()) as { secure_url?: string };
	if (data.secure_url) {
		imageCache[publicIdHint] = data.secure_url;
		saveCache();
		return data.secure_url;
	}

	return sourceUrl;
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function daysAgo(n: number): Date {
	return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

// ─── TAXONOMY DEFINITION ───────────────────────────────────────────────────

interface TaxonomyCategory {
	name: string;
	url: string;
	subCategories: Array<{ name: string; url: string }>;
}

const CATEGORIES: TaxonomyCategory[] = [
	{
		name: 'Electronics & Gadgets',
		url: 'electronics-gadgets',
		subCategories: [
			{ name: 'Smartphones & Mobile', url: 'smartphones-mobile' },
			{ name: 'Laptops & Computers', url: 'laptops-computers' },
			{ name: 'Audio & Headphones', url: 'audio-headphones' },
			{ name: 'Smart Home & Displays', url: 'smart-home-displays' },
		],
	},
	{
		name: 'Fashion & Apparel',
		url: 'fashion-apparel',
		subCategories: [
			{ name: "Men's Outerwear", url: 'mens-outerwear' },
			{ name: 'Tailored Suits & Blazers', url: 'tailored-blazers' },
			{ name: 'Athletic Footwear', url: 'athletic-footwear' },
			{ name: 'Bags & Backpacks', url: 'bags-backpacks' },
		],
	},
	{
		name: 'Home & Living',
		url: 'home-living',
		subCategories: [
			{ name: 'Dining & Kitchen Furniture', url: 'dining-furniture' },
			{ name: 'Espresso & Coffee Machines', url: 'espresso-machines' },
			{ name: 'Living Room Seating', url: 'living-room-seating' },
			{ name: 'Linen & Bedding', url: 'linen-bedding' },
		],
	},
	{
		name: 'Sports & Fitness',
		url: 'sports-fitness',
		subCategories: [
			{ name: 'Strength & Free Weights', url: 'strength-free-weights' },
			{ name: 'Cycling & Road Bikes', url: 'cycling-road-bikes' },
			{ name: 'Camping & Outdoor Shelters', url: 'camping-shelters' },
			{ name: 'Yoga & Recovery', url: 'yoga-recovery' },
		],
	},
	{
		name: 'Beauty & Personal Care',
		url: 'beauty-personal-care',
		subCategories: [
			{ name: 'Facial Serums & Treatments', url: 'facial-serums' },
			{ name: 'Artisanal Fragrances', url: 'artisanal-fragrances' },
			{ name: 'Sonic Skincare Tools', url: 'skincare-tools' },
			{ name: 'Body & Scalp Care', url: 'body-scalp-care' },
		],
	},
	{
		name: 'Watches & Accessories',
		url: 'watches-accessories',
		subCategories: [
			{ name: 'Automatic Chronographs', url: 'automatic-chronographs' },
			{ name: 'Diver & Tool Watches', url: 'diver-tool-watches' },
			{ name: 'Polarized Eyewear', url: 'polarized-eyewear' },
			{ name: 'Handcrafted Leather Goods', url: 'leather-goods' },
		],
	},
];

// ─── PRODUCT CATALOG DEFINITIONS (ALL WITH AT LEAST 5 CONNECTED IMAGES) ─────

interface SizeInput {
	size: string;
	price: number;
	discount: number;
	quantity: number;
}

interface SpecInput {
	name: string;
	value: string;
}

interface VariantInput {
	variantName: string;
	variantDescription: string;
	keywords: string;
	weight: number;
	isSale: boolean;
	specs: SpecInput[];
	sizes: SizeInput[];
	images: string[]; // 5 real high-res images connected with the item
}

interface ProductInput {
	name: string;
	brand: string;
	description: string;
	categoryUrl: string;
	subCategoryUrl: string;
	shippingFeeMethod: ShippingFeeMethod;
	freeShipping: boolean;
	variants: VariantInput[];
}

const CATALOG: ProductInput[] = [
	// ── CATEGORY 1: ELECTRONICS & GADGETS ─────────────────────────────────────
	{
		name: 'Nova Pro 15 Ultra Smartphone',
		brand: 'NovaMobile',
		description: 'Flagship 6.8-inch Dynamic AMOLED 120Hz display, 200MP pro-grade camera sensor, Snapdragon 8 Gen 3, and 5000mAh battery with 65W fast charging.',
		categoryUrl: 'electronics-gadgets',
		subCategoryUrl: 'smartphones-mobile',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Obsidian Black',
				variantDescription: 'Matte AG glass finish with aerospace aluminum frame.',
				keywords: 'smartphone,android,5g,novamobile,flagship,oled',
				weight: 0.22,
				isSale: false,
				specs: [
					{ name: 'Display', value: '6.8" AMOLED 120Hz LTPO' },
					{ name: 'Processor', value: 'Snapdragon 8 Gen 3' },
					{ name: 'Camera', value: '200MP + 50MP + 12MP' },
					{ name: 'Battery', value: '5000 mAh 65W Fast Charge' },
				],
				sizes: [
					{ size: '256 GB / 12 GB RAM', price: 899, discount: 0, quantity: 40 },
					{ size: '512 GB / 16 GB RAM', price: 1049, discount: 5, quantity: 25 },
				],
				images: [
					'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
					'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80',
					'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&q=80',
					'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&q=80',
					'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'AeroBook Studio 16 Laptop',
		brand: 'AeroTech',
		description: 'Ultra-slim 16-inch 3.2K OLED creator laptop with 16-core CPU, RTX 4070 studio graphics, 32GB LPDDR5X RAM, and 18-hour battery longevity.',
		categoryUrl: 'electronics-gadgets',
		subCategoryUrl: 'laptops-computers',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Space Gray',
				variantDescription: 'Precision CNC unibody aluminum with dual vapor-chamber cooling.',
				keywords: 'laptop,creator,ultrabook,oled,aerobook,studio',
				weight: 1.65,
				isSale: true,
				specs: [
					{ name: 'Screen', value: '16" 3.2K 120Hz OLED Display' },
					{ name: 'RAM', value: '32 GB LPDDR5X' },
					{ name: 'Storage', value: '1 TB NVMe Gen4 SSD' },
					{ name: 'Weight', value: '1.65 kg' },
				],
				sizes: [
					{ size: '1TB SSD / 32GB RAM', price: 1799, discount: 10, quantity: 20 },
					{ size: '2TB SSD / 64GB RAM', price: 2199, discount: 0, quantity: 12 },
				],
				images: [
					'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
					'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
					'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&q=80',
					'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&q=80',
					'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'SoundCore Studio Wireless Headphones',
		brand: 'AudioPulse',
		description: 'Over-ear studio monitors featuring 45mm custom biocellulose drivers, hybrid active noise cancellation, LDAC high-resolution streaming, and 50-hour playback.',
		categoryUrl: 'electronics-gadgets',
		subCategoryUrl: 'audio-headphones',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Matte Midnight',
				variantDescription: 'Memory foam protein leather earcups with lightweight carbon-reinforced headband.',
				keywords: 'headphones,anc,audiophile,wireless,ldac,bluetooth',
				weight: 0.28,
				isSale: false,
				specs: [
					{ name: 'Driver', value: '45mm Biocellulose Neodymium' },
					{ name: 'Battery', value: '50h with ANC on' },
					{ name: 'Codecs', value: 'LDAC, AAC, SBC, aptX HD' },
					{ name: 'Connectivity', value: 'Bluetooth 5.3 + 3.5mm AUX' },
				],
				sizes: [
					{ size: 'Standard Edition', price: 249, discount: 0, quantity: 50 },
					{ size: 'Travel Case Bundle', price: 279, discount: 0, quantity: 35 },
				],
				images: [
					'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
					'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80',
					'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&q=80',
					'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80',
					'https://images.unsplash.com/photo-1578319439574-30ec70619017?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Horizon Stream 4K Smart TV',
		brand: 'HorizonVision',
		description: 'Cinema-grade 55-inch 4K Quantum Dot Mini-LED display with Dolby Vision HDR, 144Hz variable refresh rate for gaming, and immersive 60W soundbar built-in.',
		categoryUrl: 'electronics-gadgets',
		subCategoryUrl: 'smart-home-displays',
		shippingFeeMethod: ShippingFeeMethod.FIXED,
		freeShipping: false,
		variants: [
			{
				variantName: 'Slim Bezel Charcoal',
				variantDescription: 'Near zero-border titanium frame with integrated cable management stand.',
				keywords: 'smart tv,4k,mini-led,hdr,144hz,home theater',
				weight: 15.2,
				isSale: false,
				specs: [
					{ name: 'Resolution', value: '3840 x 2160 4K Ultra HD' },
					{ name: 'Panel', value: 'Quantum Mini-LED 144Hz' },
					{ name: 'Audio', value: '60W Dolby Atmos 2.1.2' },
					{ name: 'Ports', value: '4x HDMI 2.1, 2x USB 3.0, eARC' },
				],
				sizes: [
					{ size: '55 Inch', price: 799, discount: 0, quantity: 15 },
					{ size: '65 Inch', price: 1099, discount: 8, quantity: 10 },
				],
				images: [
					'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&q=80',
					'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&q=80',
					'https://images.unsplash.com/photo-1552975084-6e027cd345c2?w=800&q=80',
					'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=800&q=80',
					'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=800&q=80',
				],
			},
		],
	},

	// ── CATEGORY 2: FASHION & APPAREL ─────────────────────────────────────────
	{
		name: 'Urban Minimalist Trench Coat',
		brand: 'Atelier Nord',
		description: 'Double-breasted weather-resistant technical cotton trench coat, tailored with a storm flap, horn buttons, and a removable insulated inner vest.',
		categoryUrl: 'fashion-apparel',
		subCategoryUrl: 'mens-outerwear',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Camel Brown',
				variantDescription: 'Warm camel shade in durable twill weave with waterproof DWR finish.',
				keywords: 'trench coat,outerwear,mens fashion,jacket,waterproof',
				weight: 1.1,
				isSale: false,
				specs: [
					{ name: 'Material', value: '70% Organic Cotton, 30% Recycled Nylon' },
					{ name: 'Fit', value: 'Modern Tailored Long Line' },
					{ name: 'Care', value: 'Dry Clean Only' },
				],
				sizes: [
					{ size: 'Small (38R)', price: 320, discount: 0, quantity: 18 },
					{ size: 'Medium (40R)', price: 320, discount: 0, quantity: 25 },
					{ size: 'Large (42R)', price: 320, discount: 0, quantity: 20 },
					{ size: 'XL (44R)', price: 340, discount: 0, quantity: 12 },
				],
				images: [
					'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80',
					'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=80',
					'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
					'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80',
					'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Classic Tailored Wool Blazer',
		brand: 'Sartorial House',
		description: 'Expertly constructed single-breasted blazer made from 100% fine Italian merino wool with natural shoulder construction and cupro lining.',
		categoryUrl: 'fashion-apparel',
		subCategoryUrl: 'tailored-blazers',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Deep Navy',
				variantDescription: 'Versatile deep navy hopsack wool with notched lapel and horn buttons.',
				keywords: 'blazer,wool,suit jacket,tailored,formalwear',
				weight: 0.9,
				isSale: true,
				specs: [
					{ name: 'Fabric', value: '100% Super 130s Merino Wool' },
					{ name: 'Lining', value: '100% Breathable Bemberg Cupro' },
					{ name: 'Lapel', value: 'Notch Lapel 3.25"' },
				],
				sizes: [
					{ size: '38 Regular', price: 450, discount: 15, quantity: 14 },
					{ size: '40 Regular', price: 450, discount: 15, quantity: 22 },
					{ size: '42 Regular', price: 450, discount: 15, quantity: 19 },
				],
				images: [
					'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
					'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80',
					'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&q=80',
					'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800&q=80',
					'https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Stratus Cushion Running Shoes',
		brand: 'Velocity Labs',
		description: 'Daily training running shoe engineered with dual-density supercritical foam midsole, engineered breathable jacquard mesh, and high-abrasion rubber outsole.',
		categoryUrl: 'fashion-apparel',
		subCategoryUrl: 'athletic-footwear',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Crimson & Cloud White',
				variantDescription: 'High-visibility energetic crimson with reflective accents for low-light runs.',
				keywords: 'sneakers,running shoes,marathon,cushion,footwear',
				weight: 0.55,
				isSale: false,
				specs: [
					{ name: 'Drop', value: '8mm Heel-to-Toe' },
					{ name: 'Midsole', value: 'NitroFoam Supercritical EVA' },
					{ name: 'Outsole', value: 'GripCompound Carbon Rubber' },
				],
				sizes: [
					{ size: 'US 8.5', price: 160, discount: 0, quantity: 25 },
					{ size: 'US 9.5', price: 160, discount: 0, quantity: 30 },
					{ size: 'US 10.5', price: 160, discount: 0, quantity: 28 },
					{ size: 'US 11.5', price: 160, discount: 0, quantity: 15 },
				],
				images: [
					'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
					'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80',
					'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80',
					'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80',
					'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Nomad Waterproof Commuter Backpack',
		brand: 'TerraPack',
		description: '28L everyday commute and travel pack with dedicated 16-inch padded laptop sleeve, magnetic Fidlock buckle, hidden passport pocket, and weatherproof YKK zippers.',
		categoryUrl: 'fashion-apparel',
		subCategoryUrl: 'bags-backpacks',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Matte Slate',
				variantDescription: 'Ballistic 840D recycled Cordura nylon with PU water-resistant coating.',
				keywords: 'backpack,commuter,laptop bag,travel,waterproof',
				weight: 0.95,
				isSale: false,
				specs: [
					{ name: 'Capacity', value: '28 Liters' },
					{ name: 'Laptop Compartment', value: 'Up to 16" MacBook Pro' },
					{ name: 'Dimensions', value: '48 x 32 x 18 cm' },
				],
				sizes: [
					{ size: '28L Standard', price: 185, discount: 0, quantity: 45 },
					{ size: '32L Expanded', price: 210, discount: 0, quantity: 30 },
				],
				images: [
					'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
					'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&q=80',
					'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80',
					'https://images.unsplash.com/photo-1577733966973-d680bffd2e80?w=800&q=80',
					'https://images.unsplash.com/photo-1546938576-6e6a64f317cc?w=800&q=80',
				],
			},
		],
	},

	// ── CATEGORY 3: HOME & LIVING ─────────────────────────────────────────────
	{
		name: 'Artisan Walnut Dining Table',
		brand: 'Solstice Woods',
		description: 'Handcrafted solid American black walnut dining table with beveled edge profile, finished in natural plant-based hardwax oil for lifetime durability.',
		categoryUrl: 'home-living',
		subCategoryUrl: 'dining-furniture',
		shippingFeeMethod: ShippingFeeMethod.FIXED,
		freeShipping: false,
		variants: [
			{
				variantName: 'Natural Walnut',
				variantDescription: 'Solid sustainably harvested walnut showing organic grain variations.',
				keywords: 'dining table,walnut,hardwood,furniture,artisan',
				weight: 48.0,
				isSale: false,
				specs: [
					{ name: 'Material', value: '100% Solid American Black Walnut' },
					{ name: 'Seating', value: 'Seats 6 to 8 Comfortably' },
					{ name: 'Finish', value: 'Matte Natural Hardwax Oil' },
				],
				sizes: [
					{ size: '72" Length (Seats 6)', price: 1250, discount: 0, quantity: 8 },
					{ size: '84" Length (Seats 8)', price: 1450, discount: 0, quantity: 6 },
				],
				images: [
					'https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=800&q=80',
					'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=800&q=80',
					'https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=800&q=80',
					'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
					'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Aroma Barista Espresso Machine',
		brand: 'CremaCraft',
		description: 'Commercial-grade dual boiler home espresso machine with PID digital temperature stability, 15-bar Italian rotary pump, and powerful microfoam steam wand.',
		categoryUrl: 'home-living',
		subCategoryUrl: 'espresso-machines',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Brushed Stainless Steel',
				variantDescription: 'Heavy-gauge stainless steel casing with polished brass portafilter.',
				keywords: 'espresso machine,coffee maker,barista,dual boiler,latte',
				weight: 12.5,
				isSale: true,
				specs: [
					{ name: 'Boiler', value: 'Dual Stainless Steel (Brew & Steam)' },
					{ name: 'Pump', value: '15-Bar Italian Vibration Pump' },
					{ name: 'Water Tank', value: '2.5L Removable Reservoir' },
				],
				sizes: [
					{ size: 'Standard Kit', price: 699, discount: 10, quantity: 15 },
					{ size: 'Barista Bundle with Tamper', price: 749, discount: 10, quantity: 12 },
				],
				images: [
					'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800&q=80',
					'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
					'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=800&q=80',
					'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
					'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Elysian Velvet Accent Armchair',
		brand: 'Velvet & Oak',
		description: 'Mid-century lounge chair featuring plush high-resilience foam padding upholstered in jewel-tone performance velvet on solid tapered brass legs.',
		categoryUrl: 'home-living',
		subCategoryUrl: 'living-room-seating',
		shippingFeeMethod: ShippingFeeMethod.FIXED,
		freeShipping: false,
		variants: [
			{
				variantName: 'Emerald Green',
				variantDescription: 'Stain-resistant performance velvet with solid brass tapered feet.',
				keywords: 'armchair,velvet,lounge chair,furniture,mid-century',
				weight: 16.0,
				isSale: false,
				specs: [
					{ name: 'Dimensions', value: '32"W x 34"D x 31"H' },
					{ name: 'Frame', value: 'Kiln-Dried FSC Certified Birch' },
					{ name: 'Upholstery', value: '100% Performance Polyester Velvet' },
				],
				sizes: [
					{ size: 'Single Lounge Chair', price: 480, discount: 0, quantity: 10 },
					{ size: 'Pair Set with Ottoman', price: 890, discount: 5, quantity: 6 },
				],
				images: [
					'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80',
					'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
					'https://images.unsplash.com/photo-1580481077195-c228c307f98e?w=800&q=80',
					'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
					'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Pure Organic Linen Bedding Set',
		brand: 'Haven Threads',
		description: 'Woven from 100% French flax linen, pre-washed with pumice stones for immediate softness. Naturally temperature regulating and antibacterial.',
		categoryUrl: 'home-living',
		subCategoryUrl: 'linen-bedding',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Oatmeal Beige',
				variantDescription: 'Unbleached natural flax hue with coconut shell button closures.',
				keywords: 'bedding,linen sheets,french flax,duvet cover,organic',
				weight: 2.8,
				isSale: false,
				specs: [
					{ name: 'Material', value: '100% French Flax Linen (175 GSM)' },
					{ name: 'Includes', value: '1 Duvet Cover, 1 Fitted Sheet, 2 Pillowcases' },
					{ name: 'Certification', value: 'OEKO-TEX Standard 100' },
				],
				sizes: [
					{ size: 'Queen Set', price: 260, discount: 0, quantity: 25 },
					{ size: 'King Set', price: 295, discount: 0, quantity: 20 },
				],
				images: [
					'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',
					'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80',
					'https://images.unsplash.com/photo-1540518614846-7ede433c4ef2?w=800&q=80',
					'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80',
					'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
				],
			},
		],
	},

	// ── CATEGORY 4: SPORTS & FITNESS ──────────────────────────────────────────
	{
		name: 'Vortex Adjustable Dumbbell Set',
		brand: 'IronForge',
		description: 'Rapid-dial selector system adjusts each dumbbell from 5 to 52.5 lbs in 2.5 lb increments. Replaces 15 pairs of free weights in a compact home footprint.',
		categoryUrl: 'sports-fitness',
		subCategoryUrl: 'strength-free-weights',
		shippingFeeMethod: ShippingFeeMethod.FIXED,
		freeShipping: false,
		variants: [
			{
				variantName: 'Matte Cast Steel',
				variantDescription: 'Textured knurled steel grip with quiet impact-molded weight plates.',
				keywords: 'dumbbells,free weights,home gym,strength training,workout',
				weight: 24.0,
				isSale: false,
				specs: [
					{ name: 'Weight Range', value: '5 to 52.5 lbs (2.5 to 24 kg) per hand' },
					{ name: 'Adjustments', value: '15 Distinct Weight Settings' },
					{ name: 'Trays', value: 'Includes 2 Durable Storage Docks' },
				],
				sizes: [
					{ size: 'Pair (52.5 lbs each)', price: 379, discount: 0, quantity: 20 },
					{ size: 'Pair + Ergonomic Stand', price: 459, discount: 5, quantity: 15 },
				],
				images: [
					'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&q=80',
					'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80',
					'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
					'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80',
					'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'AeroSpeed Carbon Road Bicycle',
		brand: 'Veloce Cycles',
		description: 'Ultralight Toray T800 carbon fiber frameset equipped with electronic 2x12 speed groupset, hydraulic disc braking, and tubeless aerodynamic 50mm wheelset.',
		categoryUrl: 'sports-fitness',
		subCategoryUrl: 'cycling-road-bikes',
		shippingFeeMethod: ShippingFeeMethod.FIXED,
		freeShipping: false,
		variants: [
			{
				variantName: 'Stealth Matte Carbon',
				variantDescription: 'Raw unidirectional carbon with iridescent logo highlights.',
				keywords: 'road bike,bicycle,carbon fiber,cycling,veloce',
				weight: 7.4,
				isSale: false,
				specs: [
					{ name: 'Frame', value: 'Toray T800 Monocoque Carbon (840g)' },
					{ name: 'Groupset', value: 'Electronic 2x12 Speed Wireless' },
					{ name: 'Brakes', value: 'Hydraulic Disc Flat Mount 160mm' },
				],
				sizes: [
					{ size: 'Medium (54cm)', price: 2850, discount: 0, quantity: 5 },
					{ size: 'Large (56cm)', price: 2850, discount: 0, quantity: 5 },
				],
				images: [
					'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
					'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=800&q=80',
					'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=800&q=80',
					'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800&q=80',
					'https://images.unsplash.com/photo-1502744688674-c619d1586c9e?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Summit Expedition 4-Season Tent',
		brand: 'Alpine Peak',
		description: 'Geodesic mountaineering tent designed for harsh alpine conditions. Ripstop silicone-coated nylon shell rated to 5000mm hydrostatic head with aircraft aluminum poles.',
		categoryUrl: 'sports-fitness',
		subCategoryUrl: 'camping-shelters',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Forest Orange & Slate',
				variantDescription: 'High-visibility safety orange fly with storm snow skirts.',
				keywords: 'tent,camping,mountaineering,expedition,outdoor,shelter',
				weight: 3.4,
				isSale: false,
				specs: [
					{ name: 'Capacity', value: '3-Person Alpine Rating' },
					{ name: 'Poles', value: 'DAC Featherlite NSL Aluminum' },
					{ name: 'Waterproofing', value: '5000mm PU / Silicone Double Coating' },
				],
				sizes: [
					{ size: '2-Person Footprint', price: 420, discount: 0, quantity: 15 },
					{ size: '3-Person Footprint', price: 490, discount: 0, quantity: 12 },
				],
				images: [
					'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
					'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800&q=80',
					'https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=800&q=80',
					'https://images.unsplash.com/photo-1492648272180-61e45a8d98a7?w=800&q=80',
					'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'EcoGrip Natural Rubber Yoga Mat',
		brand: 'Prana Core',
		description: '5mm dense non-slip yoga mat made from biodegradable tree rubber topped with absorbent soft-touch polyurethane for unmatched wet-and-dry traction.',
		categoryUrl: 'sports-fitness',
		subCategoryUrl: 'yoga-recovery',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Moss Sage',
				variantDescription: 'Muted botanical sage green with laser-etched alignment guides.',
				keywords: 'yoga mat,fitness,pilates,exercise,rubber mat',
				weight: 2.3,
				isSale: false,
				specs: [
					{ name: 'Thickness', value: '5.0 mm High-Density Cushion' },
					{ name: 'Material', value: 'Natural Tree Rubber + Eco Polyurethane' },
					{ name: 'Dimensions', value: '72" x 26" (183cm x 66cm)' },
				],
				sizes: [
					{ size: 'Standard 5mm', price: 95, discount: 0, quantity: 40 },
					{ size: 'Pro Long & Wide (74")', price: 115, discount: 0, quantity: 25 },
				],
				images: [
					'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80',
					'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
					'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
					'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
					'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=800&q=80',
				],
			},
		],
	},

	// ── CATEGORY 5: BEAUTY & PERSONAL CARE ────────────────────────────────────
	{
		name: 'Radiance Botanicals Hyaluronic Serum',
		brand: 'FloraLab',
		description: 'Triple-molecular-weight hyaluronic acid serum infused with niacinamide, provitamin B5, and organic centella asiatica for deep hydration and barrier repair.',
		categoryUrl: 'beauty-personal-care',
		subCategoryUrl: 'facial-serums',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: '50ml Amber Dropper',
				variantDescription: 'UV-protective pharmaceutical amber glass bottle with glass dropper.',
				keywords: 'skincare,serum,hyaluronic acid,moisturizer,glow',
				weight: 0.15,
				isSale: false,
				specs: [
					{ name: 'Volume', value: '50 ml / 1.7 fl oz' },
					{ name: 'Key Actives', value: '3% Multi-Weight HA, 2% Niacinamide' },
					{ name: 'Formula', value: 'Fragrance-Free, Vegan, Cruelty-Free' },
				],
				sizes: [
					{ size: '30 ml Bottle', price: 42, discount: 0, quantity: 50 },
					{ size: '50 ml Bottle', price: 62, discount: 0, quantity: 45 },
				],
				images: [
					'https://images.unsplash.com/photo-1608248597359-009f06774641?w=800&q=80',
					'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80',
					'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80',
					'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&q=80',
					'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Oud & Bergamot Artisanal Eau de Parfum',
		brand: "Maison d'Arôme",
		description: 'Handcrafted perfume blending sparkling Calabrian bergamot, smoky cedarwood, and rich natural agarwood (oud) for a long-lasting and sophisticated sillage.',
		categoryUrl: 'beauty-personal-care',
		subCategoryUrl: 'artisanal-fragrances',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: '100ml Heavy Crystal Flacon',
				variantDescription: 'Weighted crystal flacon with magnetic cap in a velvet-lined box.',
				keywords: 'perfume,fragrance,oud,bergamot,cologne,artisanal',
				weight: 0.42,
				isSale: false,
				specs: [
					{ name: 'Concentration', value: 'Eau de Parfum (22% Oil Concentration)' },
					{ name: 'Top Notes', value: 'Calabrian Bergamot, Pink Peppercorn' },
					{ name: 'Base Notes', value: 'Rare Cambodian Oud, Amber, Vetiver' },
				],
				sizes: [
					{ size: '50 ml Flacon', price: 120, discount: 0, quantity: 30 },
					{ size: '100 ml Flacon', price: 185, discount: 0, quantity: 24 },
				],
				images: [
					'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&q=80',
					'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80',
					'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&q=80',
					'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800&q=80',
					'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'UltraSonic Deep Cleansing Facial Brush',
		brand: 'DermaSonic',
		description: 'Medical-grade antibacterial silicone facial cleansing device delivering 8,000 transdermal sonic pulsations per minute with integrated thermal warm-compress mode.',
		categoryUrl: 'beauty-personal-care',
		subCategoryUrl: 'skincare-tools',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Blush Pink',
				variantDescription: 'Waterproof IPX7 casing with inductive magnetic charging base.',
				keywords: 'facial brush,sonic,skincare device,cleanser,pore treatment',
				weight: 0.18,
				isSale: true,
				specs: [
					{ name: 'Pulsation Speed', value: '12 Adjustable Sonic Intensities' },
					{ name: 'Battery Life', value: 'Up to 300 uses per full charge' },
					{ name: 'Waterproofing', value: 'IPX7 Submersible' },
				],
				sizes: [
					{ size: 'Standard Edition', price: 89, discount: 10, quantity: 35 },
					{ size: 'Travel Pack with Case', price: 109, discount: 0, quantity: 25 },
				],
				images: [
					'https://images.unsplash.com/photo-1556760544-74068565f05c?w=800&q=80',
					'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
					'https://images.unsplash.com/photo-1563178406-4cdc2923acbc?w=800&q=80',
					'https://images.unsplash.com/photo-1512290900672-1f0230b8089e?w=800&q=80',
					'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Revitalizing Sea Salt Scalp Scrub',
		brand: 'OceanEssence',
		description: 'Detoxifying pre-shampoo scalp exfoliator made with Brittany coastal sea salt crystals, soothing tea tree oil, and sweet almond oil to purify and balance.',
		categoryUrl: 'beauty-personal-care',
		subCategoryUrl: 'body-scalp-care',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: '250g Recycled Glass Tub',
				variantDescription: 'Thick paste scrub with included wooden application spoon.',
				keywords: 'scalp scrub,haircare,sea salt,exfoliant,spa treatment',
				weight: 0.35,
				isSale: false,
				specs: [
					{ name: 'Size', value: '250 g / 8.8 oz' },
					{ name: 'Ingredients', value: 'Natural Sea Salt, Tea Tree, Almond Oil' },
					{ name: 'Free From', value: 'Sulfates, Silicones, Parabens' },
				],
				sizes: [
					{ size: '250g Jar', price: 34, discount: 0, quantity: 45 },
					{ size: 'Double Value Pack (2x 250g)', price: 58, discount: 0, quantity: 20 },
				],
				images: [
					'https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?w=800&q=80',
					'https://images.unsplash.com/photo-1556228722-d0b5d15c71b6?w=800&q=80',
					'https://images.unsplash.com/photo-1608248597359-009f06774641?w=800&q=80',
					'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80',
					'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80',
				],
			},
		],
	},

	// ── CATEGORY 6: WATCHES & ACCESSORIES ─────────────────────────────────────
	{
		name: 'Chronograph Automatic Aviator Watch',
		brand: 'Chronos & Co',
		description: 'Swiss-inspired automatic chronograph featuring a 42mm stainless steel case, anti-reflective sapphire crystal, column-wheel mechanical movement, and tachymeter bezel.',
		categoryUrl: 'watches-accessories',
		subCategoryUrl: 'automatic-chronographs',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Sapphire & Midnight Blue',
				variantDescription: 'Sunray deep blue dial with hand-stitched Italian calfskin leather strap.',
				keywords: 'watch,chronograph,automatic,aviator,luxury,timepiece',
				weight: 0.16,
				isSale: false,
				specs: [
					{ name: 'Movement', value: 'Calibre CH-7750 Automatic (48h Reserve)' },
					{ name: 'Glass', value: 'Domed Scratch-Proof Sapphire Crystal' },
					{ name: 'Water Resistance', value: '10 ATM / 100 Meters' },
					{ name: 'Case Size', value: '42mm Diameter, 13.5mm Thickness' },
				],
				sizes: [
					{ size: '42mm Leather Strap', price: 680, discount: 0, quantity: 18 },
					{ size: '42mm Steel Mesh Bracelet', price: 740, discount: 0, quantity: 12 },
				],
				images: [
					'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
					'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
					'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
					'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=800&q=80',
					'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Titanium Diver 300M Mechanical Watch',
		brand: 'NauticMaster',
		description: 'Grade 5 aerospace titanium professional diving timepiece with 120-click ceramic unidirectional bezel, helium escape valve, Super-LumiNova BGW9 indices, and 300m depth rating.',
		categoryUrl: 'watches-accessories',
		subCategoryUrl: 'diver-tool-watches',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Matte Gunmetal',
				variantDescription: 'Full grade 5 titanium case and oyster-style bracelet with micro-adjust clasp.',
				keywords: 'diver watch,titanium,automatic,300m,diver,tool watch',
				weight: 0.12,
				isSale: false,
				specs: [
					{ name: 'Case Material', value: 'Grade 5 Lightweight Titanium' },
					{ name: 'Bezel', value: '120-Click Ceramic Insert with Lume' },
					{ name: 'Depth Rating', value: '30 ATM / 300 Meters ISO 6425' },
					{ name: 'Lume', value: 'Swiss Super-LumiNova BGW9 (Blue Glow)' },
				],
				sizes: [
					{ size: '41mm Titanium Bracelet', price: 820, discount: 0, quantity: 15 },
					{ size: '41mm Rubber Expedition Strap', price: 780, discount: 0, quantity: 10 },
				],
				images: [
					'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
					'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&q=80',
					'https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43?w=800&q=80',
					'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
					'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Aviator Polarized Titanium Sunglasses',
		brand: 'SolRay Optics',
		description: 'Ultralight Japanese titanium aviator sunglasses fitted with mineral glass polarized lenses offering 100% UVA/UVB protection, hydro-oleophobic coating, and zero distortion.',
		categoryUrl: 'watches-accessories',
		subCategoryUrl: 'polarized-eyewear',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Gold & Bottle Green',
				variantDescription: 'Polished 18k electroplated titanium with classic G-15 green polarized lenses.',
				keywords: 'sunglasses,aviator,polarized,titanium,eyewear',
				weight: 0.035,
				isSale: false,
				specs: [
					{ name: 'Frame Material', value: '100% Japanese Beta-Titanium' },
					{ name: 'Lens', value: 'Optical Crown Mineral Glass Polarized' },
					{ name: 'Hinges', value: 'Custom 5-Barrel Precision Screws' },
				],
				sizes: [
					{ size: 'Medium (55-17-145)', price: 215, discount: 0, quantity: 30 },
					{ size: 'Large (58-17-145)', price: 215, discount: 0, quantity: 25 },
				],
				images: [
					'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
					'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80',
					'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&q=80',
					'https://images.unsplash.com/photo-1577803645773-f96470509666?w=800&q=80',
					'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&q=80',
				],
			},
		],
	},
	{
		name: 'Heritage Italian Full-Grain Leather Wallet',
		brand: 'Cuoio Toscano',
		description: 'Handcrafted bifold wallet cut from vegetable-tanned Tuscan full-grain leather with RFID shielding, 8 credit card slots, and dual full-length currency compartments.',
		categoryUrl: 'watches-accessories',
		subCategoryUrl: 'leather-goods',
		shippingFeeMethod: ShippingFeeMethod.ITEM,
		freeShipping: true,
		variants: [
			{
				variantName: 'Espresso Brown',
				variantDescription: 'Develops an individual, rich patina over time with hand-burnished wax edges.',
				keywords: 'wallet,leather,bifold,rfid,italian leather,accessories',
				weight: 0.08,
				isSale: false,
				specs: [
					{ name: 'Leather', value: 'Full-Grain Vegetable Tanned Tuscan Cowhide' },
					{ name: 'Capacity', value: '8 Card Slots, 2 Bill Slots, 2 Receipt Pockets' },
					{ name: 'Protection', value: 'Integrated RFID Blocking Foil' },
				],
				sizes: [
					{ size: 'Classic Bifold', price: 95, discount: 0, quantity: 45 },
					{ size: 'Slim Cardholder Edition', price: 65, discount: 0, quantity: 35 },
				],
				images: [
					'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80',
					'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=800&q=80',
					'https://images.unsplash.com/photo-1606503829029-57e04b46c6b4?w=800&q=80',
					'https://images.unsplash.com/photo-1559563458-527698bf5295?w=800&q=80',
					'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80',
				],
			},
		],
	},
];

const REVIEW_SNIPPETS = [
	{ rating: 5, review: 'Exceptional craftsmanship. The build quality exceeds expectations and arrived in 2 days.' },
	{ rating: 5, review: 'Easily the finest product in this category. Attention to detail is evident everywhere.' },
	{ rating: 4, review: 'Very pleased with the performance and look. High quality materials throughout.' },
	{ rating: 5, review: 'Matches the description and photos accurate to every detail. Highly recommended.' },
	{ rating: 4, review: 'Great balance of durability and design. Worth every single cent.' },
];

// ─── MAIN SEED FUNCTION ───────────────────────────────────────────────────

async function main() {
	console.log('=== SEEDING CENTRALIZED PRODUCT HUB ===\n');

	// 1. Locate primary store `srank`
	let store = await db.store.findUnique({ where: { url: 'srank' } });
	if (!store) {
		const anyStore = await db.store.findFirst({ where: { status: StoreStatus.ACTIVE } });
		if (!anyStore) {
			throw new Error('No active store found in database.');
		}
		store = anyStore;
	}
	console.log(`Using Store: "${store.name}" (${store.url})\n`);

	// 2. Fetch users to associate reviews
	const users = await db.user.findMany({ take: 10, select: { id: true } });

	// 3. Ensure all 6 categories and subcategories exist
	const categoryMap = new Map<string, string>();
	const subCategoryMap = new Map<string, string>();

	for (const catDef of CATEGORIES) {
		let cat = await db.category.findUnique({ where: { url: catDef.url } });
		if (!cat) {
			cat = await db.category.create({
				data: {
					name: catDef.name,
					url: catDef.url,
					image: '',
				},
			});
			console.log(`Created Category: "${catDef.name}"`);
		}
		categoryMap.set(catDef.url, cat.id);

		for (const subDef of catDef.subCategories) {
			let sub = await db.subCategory.findUnique({ where: { url: subDef.url } });
			if (!sub) {
				sub = await db.subCategory.create({
					data: {
						name: subDef.name,
						url: subDef.url,
						image: '',
						categoryId: cat.id,
					},
				});
				console.log(`  └─ Created SubCategory: "${subDef.name}"`);
			}
			subCategoryMap.set(subDef.url, sub.id);
		}
	}

	console.log('\nCategories and Subcategories initialized.\n');

	// 4. Seed each product with Cloudinary images
	let totalProducts = 0;
	let totalVariants = 0;
	let totalImages = 0;

	for (const def of CATALOG) {
		const productSlug = slugify(def.name);
		const categoryId = categoryMap.get(def.categoryUrl);
		const subCategoryId = subCategoryMap.get(def.subCategoryUrl);

		if (!categoryId || !subCategoryId) {
			console.warn(`Skipping ${def.name}: category/subcategory missing.`);
			continue;
		}

		console.log(`Processing Product: "${def.name}"...`);

		// Create or update product
		let product = await db.product.findUnique({ where: { slug: productSlug } });
		if (!product) {
			product = await db.product.create({
				data: {
					name: def.name,
					slug: productSlug,
					brand: def.brand,
					description: def.description,
					storeId: store.id,
					categoryId,
					subCategoryId,
					shippingFeeMethod: def.shippingFeeMethod,
					rating: 4.8,
					sales: 12 + Math.floor(Math.random() * 40),
					numReviews: 4,
				},
			});
		}

		totalProducts++;

		// Process variants
		for (let vi = 0; vi < def.variants.length; vi++) {
			const v = def.variants[vi];
			const variantSlug = `${productSlug}-${slugify(v.variantName)}`;
			const variantSku = `${productSlug.slice(0, 8).toUpperCase()}-V${vi + 1}`;

			// Upload 5 images to Cloudinary
			console.log(`  Uploading 5 images for variant: "${v.variantName}" to Cloudinary...`);
			const cloudinaryUrls: string[] = [];

			for (let imgIndex = 0; imgIndex < v.images.length; imgIndex++) {
				const publicIdHint = `${productSlug}_${slugify(v.variantName)}_view_${imgIndex + 1}`;
				const cloudUrl = await uploadToCloudinary(v.images[imgIndex], publicIdHint);
				cloudinaryUrls.push(cloudUrl);
				totalImages++;
			}

			// Create variant
			let variant = await db.productVariant.findUnique({ where: { slug: variantSlug } });
			if (!variant) {
				variant = await db.productVariant.create({
					data: {
						variantName: v.variantName,
						variantDescription: v.variantDescription,
						variantImage: cloudinaryUrls[0],
						slug: variantSlug,
						sku: variantSku,
						keywords: v.keywords,
						weight: v.weight,
						isSale: v.isSale,
						productId: product.id,
					},
				});
			}

			totalVariants++;

			// Insert 5 Cloudinary images into ProductVariantImage
			const existingImages = await db.productVariantImage.count({ where: { productVariantId: variant.id } });
			if (existingImages === 0) {
				await db.productVariantImage.createMany({
					data: cloudinaryUrls.map((url, order) => ({
						url,
						alt: `${def.name} - ${v.variantName} angle ${order + 1}`,
						order,
						productVariantId: variant.id,
					})),
				});
			}

			// Insert Sizes
			const existingSizes = await db.size.count({ where: { productVariantId: variant.id } });
			if (existingSizes === 0) {
				await db.size.createMany({
					data: v.sizes.map((s) => ({
						size: s.size,
						price: s.price,
						discount: s.discount,
						quantity: s.quantity,
						lowStockThreshold: 5,
						productVariantId: variant.id,
					})),
				});
			}

			// Insert Specs
			const existingSpecs = await db.spec.count({ where: { variantId: variant.id } });
			if (existingSpecs === 0) {
				await db.spec.createMany({
					data: v.specs.map((sp) => ({
						name: sp.name,
						value: sp.value,
						variantId: variant.id,
					})),
				});
			}
		}

		// Reviews
		const existingReviews = await db.review.count({ where: { productId: product.id } });
		if (existingReviews === 0 && users.length > 0) {
			const firstVariant = def.variants[0];
			const firstSize = firstVariant.sizes[0];
			for (let ri = 0; ri < 4; ri++) {
				const snippet = REVIEW_SNIPPETS[ri % REVIEW_SNIPPETS.length];
				const reviewer = users[ri % users.length];
				await db.review.create({
					data: {
						variant: firstVariant.variantName,
						variantImage: firstVariant.images[0],
						review: snippet.review,
						rating: snippet.rating,
						color: firstVariant.variantName,
						size: firstSize.size,
						quantity: '1',
						isVerifiedPurchase: true,
						userId: reviewer.id,
						productId: product.id,
						createdAt: daysAgo(30 - ri * 7),
					},
				});
			}
		}

		console.log(`  ✓ Completed "${def.name}" with 5 Cloudinary images`);
	}

	console.log('\n=== SEED SUMMARY ===');
	console.log(`Total Products Seeded: ${totalProducts}`);
	console.log(`Total Variants Seeded: ${totalVariants}`);
	console.log(`Total Cloudinary Images Stored: ${totalImages}`);
}

main()
	.catch((err) => {
		console.error('Seeder failed:', err);
		process.exitCode = 1;
	})
	.finally(() => db.$disconnect());
