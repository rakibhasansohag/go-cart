/**
 * seed-products.ts
 *
 * Populates the PRODUCTION database with ~120 realistic marketplace products
 * across 8 proper e-commerce categories, with multiple variants, realistic
 * pricing/inventory, and 3–7 reviews each.
 *
 * Reads DATABASE_URL from .env (production).
 * Safe to re-run: upserts on unique slugs, never deletes existing records.
 *
 * Usage:
 *   bun prisma/seed-products.ts
 */

import { PrismaClient, ShippingFeeMethod, StoreStatus, Role } from "@prisma/client";

const db = new PrismaClient();

// ─── helpers ───────────────────────────────────────────────────────────────

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function daysAgo(n: number): Date {
    return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

// ─── taxonomy ──────────────────────────────────────────────────────────────

const TAXONOMY = [
    {
        category: { name: "Electronics", url: "electronics" },
        subCategories: [
            { name: "Smartphones & Accessories", url: "smartphones-accessories" },
            { name: "Laptops & Computers", url: "laptops-computers" },
            { name: "Audio & Headphones", url: "audio-headphones" },
            { name: "Smart Home & IoT", url: "smart-home-iot" },
        ],
    },
    {
        category: { name: "Fashion & Apparel", url: "fashion-apparel" },
        subCategories: [
            { name: "Men's Clothing", url: "mens-clothing" },
            { name: "Women's Clothing", url: "womens-clothing" },
            { name: "Footwear", url: "footwear" },
            { name: "Bags & Accessories", url: "bags-accessories" },
        ],
    },
    {
        category: { name: "Home & Living", url: "home-living" },
        subCategories: [
            { name: "Furniture & Decor", url: "furniture-decor" },
            { name: "Kitchen & Dining", url: "kitchen-dining" },
            { name: "Bedding & Bath", url: "bedding-bath" },
        ],
    },
    {
        category: { name: "Sports & Outdoors", url: "sports-outdoors" },
        subCategories: [
            { name: "Fitness Equipment", url: "fitness-equipment" },
            { name: "Outdoor & Camping", url: "outdoor-camping" },
            { name: "Team Sports", url: "team-sports" },
        ],
    },
    {
        category: { name: "Health & Beauty", url: "health-beauty" },
        subCategories: [
            { name: "Skincare", url: "skincare" },
            { name: "Vitamins & Supplements", url: "vitamins-supplements" },
            { name: "Personal Care", url: "personal-care" },
        ],
    },
    {
        category: { name: "Books & Media", url: "books-media" },
        subCategories: [
            { name: "Books", url: "books" },
            { name: "Music & Instruments", url: "music-instruments" },
            { name: "Games & Hobbies", url: "games-hobbies" },
        ],
    },
    {
        category: { name: "Baby & Kids", url: "baby-kids" },
        subCategories: [
            { name: "Toys & Games", url: "toys-games" },
            { name: "Baby Essentials", url: "baby-essentials" },
            { name: "Kids Fashion", url: "kids-fashion" },
        ],
    },
    {
        category: { name: "Automotive", url: "automotive" },
        subCategories: [
            { name: "Car Accessories", url: "car-accessories" },
            { name: "Tools & Equipment", url: "tools-equipment" },
        ],
    },
];

// ─── product catalog ────────────────────────────────────────────────────────

interface SizeDef {
    size: string;
    price: number;
    discount: number;
    quantity: number;
}

interface VariantDef {
    variantName: string;
    variantDescription: string;
    keywords: string;
    weight: number;
    isSale: boolean;
    specs: Array<{ name: string; value: string }>;
    sizes: SizeDef[];
    imageSeeds: string[];
}

interface ProductDef {
    name: string;
    brand: string;
    description: string;
    categoryUrl: string;
    subCategoryUrl: string;
    shippingFeeMethod: ShippingFeeMethod;
    freeShipping: boolean;
    variants: VariantDef[];
}

const PRODUCTS: ProductDef[] = [
    // ── ELECTRONICS › SMARTPHONES ──────────────────────────────────────────
    {
        name: "Nova X12 Pro Smartphone",
        brand: "NovaTech",
        description:
            "6.7-inch OLED display, 200 MP camera system, 5000 mAh fast-charging battery, and 12 GB RAM for flagship performance at every turn.",
        categoryUrl: "electronics",
        subCategoryUrl: "smartphones-accessories",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: true,
        variants: [
            {
                variantName: "Midnight Black",
                variantDescription: "Sleek matte-black ceramic back with titanium frame.",
                keywords: "smartphone,android,5g,nova,flagship",
                weight: 0.22,
                isSale: false,
                specs: [
                    { name: "Display", value: '6.7" OLED 120Hz' },
                    { name: "RAM", value: "12 GB" },
                    { name: "Battery", value: "5000 mAh" },
                ],
                sizes: [
                    { size: "128 GB", price: 799, discount: 0, quantity: 45 },
                    { size: "256 GB", price: 899, discount: 0, quantity: 38 },
                    { size: "512 GB", price: 1049, discount: 0, quantity: 22 },
                ],
                imageSeeds: ["nova-x12-black-front", "nova-x12-black-side", "nova-x12-black-back"],
            },
            {
                variantName: "Pearl White",
                variantDescription: "Premium pearl-white glossy finish with anti-scratch coating.",
                keywords: "smartphone,android,5g,nova,flagship",
                weight: 0.22,
                isSale: true,
                specs: [
                    { name: "Display", value: '6.7" OLED 120Hz' },
                    { name: "RAM", value: "12 GB" },
                    { name: "Battery", value: "5000 mAh" },
                ],
                sizes: [
                    { size: "128 GB", price: 799, discount: 8, quantity: 30 },
                    { size: "256 GB", price: 899, discount: 8, quantity: 20 },
                ],
                imageSeeds: ["nova-x12-white-front", "nova-x12-white-side", "nova-x12-white-back"],
            },
        ],
    },
    {
        name: "ZenPhone 15 Ultra",
        brand: "ZenMobile",
        description:
            "Compact powerhouse with 6.1-inch AMOLED, dual SIM 5G, 50 MP triple camera, and 30 W wireless charging. Designed for professionals on the go.",
        categoryUrl: "electronics",
        subCategoryUrl: "smartphones-accessories",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: true,
        variants: [
            {
                variantName: "Cobalt Blue",
                variantDescription: "Vibrant cobalt blue with matte texture.",
                keywords: "smartphone,5g,zenphone,compact",
                weight: 0.19,
                isSale: false,
                specs: [
                    { name: "Display", value: '6.1" AMOLED' },
                    { name: "Camera", value: "50 MP triple" },
                ],
                sizes: [
                    { size: "128 GB", price: 649, discount: 0, quantity: 55 },
                    { size: "256 GB", price: 729, discount: 0, quantity: 35 },
                ],
                imageSeeds: ["zenphone-15-blue-front", "zenphone-15-blue-angle"],
            },
        ],
    },
    {
        name: "MagClear Slim Phone Case",
        brand: "Acrylux",
        description:
            "Military-grade drop protection with crystal-clear back and MagSafe compatible ring array. Compatible with all major smartphone models.",
        categoryUrl: "electronics",
        subCategoryUrl: "smartphones-accessories",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Crystal Clear",
                variantDescription: "Transparent back shows off your phone design.",
                keywords: "phone case,magsafe,clear,protection",
                weight: 0.04,
                isSale: false,
                specs: [
                    { name: "Material", value: "Polycarbonate + TPU" },
                    { name: "Protection", value: "MIL-STD-810G" },
                ],
                sizes: [
                    { size: "iPhone 15 Pro", price: 29.99, discount: 0, quantity: 120 },
                    { size: "iPhone 15", price: 29.99, discount: 0, quantity: 95 },
                    { size: "Samsung S24+", price: 29.99, discount: 0, quantity: 80 },
                ],
                imageSeeds: ["acrylux-case-clear-front", "acrylux-case-clear-detail"],
            },
            {
                variantName: "Midnight Frosted",
                variantDescription: "Frosted semi-translucent midnight finish.",
                keywords: "phone case,magsafe,frosted,protection",
                weight: 0.04,
                isSale: true,
                specs: [{ name: "Material", value: "Polycarbonate + TPU" }],
                sizes: [
                    { size: "iPhone 15 Pro", price: 29.99, discount: 15, quantity: 70 },
                    { size: "Samsung S24+", price: 29.99, discount: 15, quantity: 60 },
                ],
                imageSeeds: ["acrylux-case-frosted-front", "acrylux-case-frosted-side"],
            },
        ],
    },

    // ── ELECTRONICS › LAPTOPS ──────────────────────────────────────────────
    {
        name: "Vortex Pro 16 Laptop",
        brand: "Vortex",
        description:
            "Intel Core i9 processor, 32 GB DDR5 RAM, 1 TB NVMe SSD, and a stunning 16-inch mini-LED display. Engineered for creators and engineers.",
        categoryUrl: "electronics",
        subCategoryUrl: "laptops-computers",
        shippingFeeMethod: ShippingFeeMethod.FIXED,
        freeShipping: false,
        variants: [
            {
                variantName: "Space Gray",
                variantDescription: "CNC-machined aluminium body in space gray.",
                keywords: "laptop,intel,creator,16inch,portable",
                weight: 1.8,
                isSale: false,
                specs: [
                    { name: "CPU", value: "Intel Core i9-13900H" },
                    { name: "RAM", value: "32 GB DDR5" },
                    { name: "Storage", value: "1 TB NVMe" },
                    { name: "Display", value: '16" mini-LED 120Hz' },
                ],
                sizes: [
                    { size: "16GB / 512GB", price: 1499, discount: 0, quantity: 18 },
                    { size: "32GB / 1TB", price: 1899, discount: 0, quantity: 12 },
                ],
                imageSeeds: ["vortex-pro16-gray-front", "vortex-pro16-gray-open", "vortex-pro16-gray-side"],
            },
        ],
    },
    {
        name: "SlimBook Air 14",
        brand: "SlimBook",
        description:
            "Ultra-portable 14-inch laptop weighing just 1.1 kg. All-day battery life up to 18 hours, vibrant IPS display, and silent fanless operation.",
        categoryUrl: "electronics",
        subCategoryUrl: "laptops-computers",
        shippingFeeMethod: ShippingFeeMethod.FIXED,
        freeShipping: true,
        variants: [
            {
                variantName: "Silver",
                variantDescription: "Brushed aluminium silver finish.",
                keywords: "laptop,ultrabook,slim,portable,fanless",
                weight: 1.1,
                isSale: false,
                specs: [
                    { name: "CPU", value: "Snapdragon X Elite" },
                    { name: "RAM", value: "16 GB LPDDR5" },
                    { name: "Battery", value: "18 hrs" },
                ],
                sizes: [
                    { size: "256 GB SSD", price: 999, discount: 0, quantity: 25 },
                    { size: "512 GB SSD", price: 1149, discount: 0, quantity: 15 },
                ],
                imageSeeds: ["slimbook-air14-silver-front", "slimbook-air14-silver-open"],
            },
            {
                variantName: "Midnight Navy",
                variantDescription: "Deep navy anodised aluminium for a professional look.",
                keywords: "laptop,ultrabook,slim,portable",
                weight: 1.1,
                isSale: true,
                specs: [
                    { name: "CPU", value: "Snapdragon X Elite" },
                    { name: "RAM", value: "16 GB LPDDR5" },
                ],
                sizes: [
                    { size: "256 GB SSD", price: 999, discount: 10, quantity: 18 },
                    { size: "512 GB SSD", price: 1149, discount: 10, quantity: 10 },
                ],
                imageSeeds: ["slimbook-air14-navy-front", "slimbook-air14-navy-open"],
            },
        ],
    },

    // ── ELECTRONICS › AUDIO ────────────────────────────────────────────────
    {
        name: "SoundWave ANC Pro Headphones",
        brand: "SoundWave",
        description:
            "Industry-leading active noise cancellation, 40-hour battery, premium 40 mm drivers, and plush over-ear cushions for studio-quality listening anywhere.",
        categoryUrl: "electronics",
        subCategoryUrl: "audio-headphones",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Matte Black",
                variantDescription: "Classic matte black with aluminium accents.",
                keywords: "headphones,anc,wireless,audiophile",
                weight: 0.28,
                isSale: false,
                specs: [
                    { name: "ANC", value: "Yes, 35 dB reduction" },
                    { name: "Battery", value: "40 hrs" },
                    { name: "Driver", value: "40 mm dynamic" },
                ],
                sizes: [{ size: "One Size", price: 279, discount: 0, quantity: 60 }],
                imageSeeds: ["soundwave-anc-black-front", "soundwave-anc-black-ear", "soundwave-anc-black-folded"],
            },
            {
                variantName: "Sandstone Beige",
                variantDescription: "Warm sandstone beige with leather-touch headband.",
                keywords: "headphones,anc,wireless,audiophile",
                weight: 0.28,
                isSale: true,
                specs: [
                    { name: "ANC", value: "Yes, 35 dB reduction" },
                    { name: "Battery", value: "40 hrs" },
                ],
                sizes: [{ size: "One Size", price: 279, discount: 12, quantity: 40 }],
                imageSeeds: ["soundwave-anc-beige-front", "soundwave-anc-beige-side"],
            },
        ],
    },
    {
        name: "BassCore 5 Wireless Earbuds",
        brand: "BassCore",
        description:
            "Punchy bass, IPX5 sweat resistance, 32-hour total playtime with case, and an ergonomic wing-tip design that stays put during intense workouts.",
        categoryUrl: "electronics",
        subCategoryUrl: "audio-headphones",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Onyx Black",
                variantDescription: "Matte onyx black for a bold look.",
                keywords: "earbuds,wireless,bass,sports,ipx5",
                weight: 0.06,
                isSale: false,
                specs: [
                    { name: "Total Playtime", value: "32 hrs with case" },
                    { name: "Water Resistance", value: "IPX5" },
                ],
                sizes: [{ size: "One Size", price: 89.99, discount: 0, quantity: 90 }],
                imageSeeds: ["basscore5-black-buds", "basscore5-black-case"],
            },
            {
                variantName: "Arctic White",
                variantDescription: "Clean arctic white for an everyday look.",
                keywords: "earbuds,wireless,bass,sports",
                weight: 0.06,
                isSale: false,
                specs: [{ name: "Total Playtime", value: "32 hrs with case" }],
                sizes: [{ size: "One Size", price: 89.99, discount: 0, quantity: 75 }],
                imageSeeds: ["basscore5-white-buds", "basscore5-white-case"],
            },
        ],
    },
    {
        name: "PocketBoom Portable Speaker",
        brand: "PocketBoom",
        description:
            "360 degree surround sound in a palm-sized package. Waterproof, dustproof, and built tough for adventures. 20-hour battery and a built-in power bank.",
        categoryUrl: "electronics",
        subCategoryUrl: "audio-headphones",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Forest Green",
                variantDescription: "Rugged forest green with rubber grip.",
                keywords: "speaker,portable,waterproof,outdoor,bluetooth",
                weight: 0.45,
                isSale: false,
                specs: [
                    { name: "Water Rating", value: "IP67" },
                    { name: "Battery", value: "20 hrs" },
                ],
                sizes: [{ size: "One Size", price: 119.99, discount: 0, quantity: 55 }],
                imageSeeds: ["pocketboom-green-front", "pocketboom-green-top"],
            },
            {
                variantName: "Slate Grey",
                variantDescription: "Slate grey for a neutral, versatile look.",
                keywords: "speaker,portable,waterproof,outdoor,bluetooth",
                weight: 0.45,
                isSale: false,
                specs: [
                    { name: "Water Rating", value: "IP67" },
                    { name: "Battery", value: "20 hrs" },
                ],
                sizes: [{ size: "One Size", price: 119.99, discount: 0, quantity: 45 }],
                imageSeeds: ["pocketboom-grey-front", "pocketboom-grey-top"],
            },
        ],
    },

    // ── ELECTRONICS › SMART HOME ────────────────────────────────────────────
    {
        name: "LumiHub Smart LED Strip",
        brand: "LumiHub",
        description:
            "5-metre RGBWW addressable LED strip with music sync, 16 million colours, and voice control via Alexa and Google Home. Adhesive-backed for easy install.",
        categoryUrl: "electronics",
        subCategoryUrl: "smart-home-iot",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "5m Kit",
                variantDescription: "5 m strip with controller hub and power adapter.",
                keywords: "led strip,smart light,rgb,alexa,google home",
                weight: 0.3,
                isSale: false,
                specs: [
                    { name: "Length", value: "5 m" },
                    { name: "Colours", value: "16M RGBWW" },
                    { name: "Voice Control", value: "Alexa, Google Home" },
                ],
                sizes: [{ size: "One Size", price: 39.99, discount: 0, quantity: 200 }],
                imageSeeds: ["lumihub-strip-5m-box", "lumihub-strip-5m-installed"],
            },
            {
                variantName: "10m Kit",
                variantDescription: "10 m strip for larger spaces.",
                keywords: "led strip,smart light,rgb,alexa,google home",
                weight: 0.55,
                isSale: false,
                specs: [
                    { name: "Length", value: "10 m" },
                    { name: "Colours", value: "16M RGBWW" },
                ],
                sizes: [{ size: "One Size", price: 64.99, discount: 0, quantity: 130 }],
                imageSeeds: ["lumihub-strip-10m-box", "lumihub-strip-10m-installed"],
            },
        ],
    },
    {
        name: "NestGuard Doorbell Camera",
        brand: "NestGuard",
        description:
            "4K video doorbell with colour night vision, package detection, 2-way audio, and 24/7 local recording. Works without a subscription.",
        categoryUrl: "electronics",
        subCategoryUrl: "smart-home-iot",
        shippingFeeMethod: ShippingFeeMethod.FIXED,
        freeShipping: true,
        variants: [
            {
                variantName: "Black",
                variantDescription: "Sleek black housing with UV-resistant coating.",
                keywords: "doorbell camera,security,4k,smart home",
                weight: 0.35,
                isSale: false,
                specs: [
                    { name: "Resolution", value: "4K 30fps" },
                    { name: "Night Vision", value: "Colour" },
                    { name: "Storage", value: "Local + Cloud" },
                ],
                sizes: [{ size: "One Size", price: 149.99, discount: 0, quantity: 40 }],
                imageSeeds: ["nestguard-doorbell-black-front", "nestguard-doorbell-black-installed"],
            },
        ],
    },

    // ── FASHION › MEN'S CLOTHING ────────────────────────────────────────────
    {
        name: "Alpine Merino Wool Crewneck",
        brand: "Alpine Co.",
        description:
            "100 percent extra-fine Merino wool crewneck sweater. Temperature-regulating, odour-resistant, and machine-washable. Timeless fit for work and weekend.",
        categoryUrl: "fashion-apparel",
        subCategoryUrl: "mens-clothing",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Charcoal Grey",
                variantDescription: "Classic charcoal grey, pairs with anything.",
                keywords: "sweater,merino,wool,men,crewneck",
                weight: 0.45,
                isSale: false,
                specs: [
                    { name: "Material", value: "100% Merino Wool" },
                    { name: "Fit", value: "Regular" },
                ],
                sizes: [
                    { size: "S", price: 89.99, discount: 0, quantity: 30 },
                    { size: "M", price: 89.99, discount: 0, quantity: 45 },
                    { size: "L", price: 89.99, discount: 0, quantity: 40 },
                    { size: "XL", price: 89.99, discount: 0, quantity: 25 },
                    { size: "XXL", price: 89.99, discount: 0, quantity: 15 },
                ],
                imageSeeds: ["alpine-merino-grey-front", "alpine-merino-grey-back", "alpine-merino-grey-detail"],
            },
            {
                variantName: "Forest Green",
                variantDescription: "Rich forest green, perfect for the colder months.",
                keywords: "sweater,merino,wool,men,crewneck",
                weight: 0.45,
                isSale: true,
                specs: [{ name: "Material", value: "100% Merino Wool" }],
                sizes: [
                    { size: "S", price: 89.99, discount: 20, quantity: 20 },
                    { size: "M", price: 89.99, discount: 20, quantity: 30 },
                    { size: "L", price: 89.99, discount: 20, quantity: 25 },
                    { size: "XL", price: 89.99, discount: 20, quantity: 10 },
                ],
                imageSeeds: ["alpine-merino-green-front", "alpine-merino-green-back"],
            },
        ],
    },
    {
        name: "Urban Stretch Slim-Fit Chinos",
        brand: "UrbanThread",
        description:
            "Four-way stretch chinos with a modern slim fit. Wrinkle-resistant fabric, hidden zip pocket, and a crisp appearance whether you are in the office or out.",
        categoryUrl: "fashion-apparel",
        subCategoryUrl: "mens-clothing",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Navy Blue",
                variantDescription: "Versatile navy blue for every occasion.",
                keywords: "chinos,slim fit,stretch,men,trousers",
                weight: 0.5,
                isSale: false,
                specs: [
                    { name: "Fit", value: "Slim" },
                    { name: "Material", value: "Cotton/Elastane blend" },
                ],
                sizes: [
                    { size: "28x30", price: 59.99, discount: 0, quantity: 25 },
                    { size: "30x30", price: 59.99, discount: 0, quantity: 35 },
                    { size: "32x32", price: 59.99, discount: 0, quantity: 40 },
                    { size: "34x32", price: 59.99, discount: 0, quantity: 30 },
                    { size: "36x32", price: 59.99, discount: 0, quantity: 20 },
                ],
                imageSeeds: ["urban-chinos-navy-front", "urban-chinos-navy-side"],
            },
            {
                variantName: "Khaki",
                variantDescription: "Classic khaki for a casual, relaxed look.",
                keywords: "chinos,slim fit,stretch,men",
                weight: 0.5,
                isSale: false,
                specs: [{ name: "Fit", value: "Slim" }],
                sizes: [
                    { size: "28x30", price: 59.99, discount: 0, quantity: 20 },
                    { size: "30x30", price: 59.99, discount: 0, quantity: 30 },
                    { size: "32x32", price: 59.99, discount: 0, quantity: 35 },
                    { size: "34x32", price: 59.99, discount: 0, quantity: 25 },
                ],
                imageSeeds: ["urban-chinos-khaki-front", "urban-chinos-khaki-side"],
            },
        ],
    },
    {
        name: "Heritage Linen Button-Down Shirt",
        brand: "Heritage Cloth",
        description:
            "Relaxed linen shirt in a semi-structured fit. Mother-of-pearl buttons, side vents for breathability, and a luxuriously soft hand-feel all day long.",
        categoryUrl: "fashion-apparel",
        subCategoryUrl: "mens-clothing",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "White",
                variantDescription: "Classic white that goes with any outfit.",
                keywords: "shirt,linen,button-down,men,summer",
                weight: 0.25,
                isSale: false,
                specs: [
                    { name: "Material", value: "100% Linen" },
                    { name: "Fit", value: "Relaxed" },
                ],
                sizes: [
                    { size: "S", price: 64.99, discount: 0, quantity: 25 },
                    { size: "M", price: 64.99, discount: 0, quantity: 35 },
                    { size: "L", price: 64.99, discount: 0, quantity: 30 },
                    { size: "XL", price: 64.99, discount: 0, quantity: 20 },
                ],
                imageSeeds: ["heritage-linen-white-front", "heritage-linen-white-collar"],
            },
            {
                variantName: "Sky Blue",
                variantDescription: "Soft sky blue, ideal for warm-weather dressing.",
                keywords: "shirt,linen,button-down,men,summer,blue",
                weight: 0.25,
                isSale: false,
                specs: [{ name: "Material", value: "100% Linen" }],
                sizes: [
                    { size: "S", price: 64.99, discount: 0, quantity: 20 },
                    { size: "M", price: 64.99, discount: 0, quantity: 30 },
                    { size: "L", price: 64.99, discount: 0, quantity: 25 },
                    { size: "XL", price: 64.99, discount: 0, quantity: 15 },
                ],
                imageSeeds: ["heritage-linen-blue-front", "heritage-linen-blue-collar"],
            },
        ],
    },

    // ── FASHION › WOMEN'S CLOTHING ─────────────────────────────────────────
    {
        name: "Wrap Midi Dress",
        brand: "Florentine",
        description:
            "Flattering wrap silhouette in a flowy viscose fabric. Adjustable tie waist, flutter sleeves, and a midi hem length that works for any occasion.",
        categoryUrl: "fashion-apparel",
        subCategoryUrl: "womens-clothing",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Floral Print",
                variantDescription: "Vibrant floral print on a cream base.",
                keywords: "dress,wrap,midi,women,floral,summer",
                weight: 0.35,
                isSale: false,
                specs: [
                    { name: "Material", value: "100% Viscose" },
                    { name: "Length", value: "Midi" },
                ],
                sizes: [
                    { size: "XS", price: 69.99, discount: 0, quantity: 20 },
                    { size: "S", price: 69.99, discount: 0, quantity: 30 },
                    { size: "M", price: 69.99, discount: 0, quantity: 35 },
                    { size: "L", price: 69.99, discount: 0, quantity: 25 },
                    { size: "XL", price: 69.99, discount: 0, quantity: 15 },
                ],
                imageSeeds: ["florentine-wrap-floral-front", "florentine-wrap-floral-side"],
            },
            {
                variantName: "Sage Green",
                variantDescription: "Calm sage green solid for a minimal, refined look.",
                keywords: "dress,wrap,midi,women,sage",
                weight: 0.35,
                isSale: true,
                specs: [{ name: "Material", value: "100% Viscose" }],
                sizes: [
                    { size: "XS", price: 69.99, discount: 15, quantity: 15 },
                    { size: "S", price: 69.99, discount: 15, quantity: 25 },
                    { size: "M", price: 69.99, discount: 15, quantity: 30 },
                    { size: "L", price: 69.99, discount: 15, quantity: 20 },
                ],
                imageSeeds: ["florentine-wrap-sage-front", "florentine-wrap-sage-side"],
            },
        ],
    },
    {
        name: "Structured Blazer",
        brand: "Monarca",
        description:
            "Single-breasted blazer with padded shoulders, a nipped waist, and a clean lapel finish. Wear it buttoned for meetings or open over a tee for weekend brunch.",
        categoryUrl: "fashion-apparel",
        subCategoryUrl: "womens-clothing",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Camel",
                variantDescription: "Warm camel beige, seasonless and versatile.",
                keywords: "blazer,jacket,women,office,formal",
                weight: 0.7,
                isSale: false,
                specs: [
                    { name: "Material", value: "Wool blend" },
                    { name: "Lining", value: "Satin" },
                ],
                sizes: [
                    { size: "XS", price: 119.99, discount: 0, quantity: 15 },
                    { size: "S", price: 119.99, discount: 0, quantity: 25 },
                    { size: "M", price: 119.99, discount: 0, quantity: 30 },
                    { size: "L", price: 119.99, discount: 0, quantity: 20 },
                    { size: "XL", price: 119.99, discount: 0, quantity: 10 },
                ],
                imageSeeds: ["monarca-blazer-camel-front", "monarca-blazer-camel-detail"],
            },
            {
                variantName: "Classic Black",
                variantDescription: "Timeless black, always sharp.",
                keywords: "blazer,jacket,women,office,black",
                weight: 0.7,
                isSale: false,
                specs: [{ name: "Material", value: "Wool blend" }],
                sizes: [
                    { size: "XS", price: 119.99, discount: 0, quantity: 12 },
                    { size: "S", price: 119.99, discount: 0, quantity: 20 },
                    { size: "M", price: 119.99, discount: 0, quantity: 25 },
                    { size: "L", price: 119.99, discount: 0, quantity: 18 },
                ],
                imageSeeds: ["monarca-blazer-black-front", "monarca-blazer-black-detail"],
            },
        ],
    },
    {
        name: "Relaxed Linen Trouser",
        brand: "Solis Studio",
        description:
            "Wide-leg linen trousers with a high-rise waistband, side pockets, and an elasticated back for all-day comfort. Effortlessly chic for any season.",
        categoryUrl: "fashion-apparel",
        subCategoryUrl: "womens-clothing",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Natural Ecru",
                variantDescription: "Fresh natural ecru, works with everything.",
                keywords: "trousers,linen,wide leg,women,summer",
                weight: 0.4,
                isSale: false,
                specs: [{ name: "Material", value: "100% Linen" }, { name: "Fit", value: "Wide leg" }],
                sizes: [
                    { size: "XS", price: 74.99, discount: 0, quantity: 20 },
                    { size: "S", price: 74.99, discount: 0, quantity: 28 },
                    { size: "M", price: 74.99, discount: 0, quantity: 32 },
                    { size: "L", price: 74.99, discount: 0, quantity: 22 },
                    { size: "XL", price: 74.99, discount: 0, quantity: 14 },
                ],
                imageSeeds: ["solis-linen-trouser-ecru-front", "solis-linen-trouser-ecru-side"],
            },
        ],
    },

    // ── FASHION › FOOTWEAR ─────────────────────────────────────────────────
    {
        name: "CloudRun Pro Running Shoe",
        brand: "CloudRun",
        description:
            "Carbon-fibre plate, dual-layer foam midsole, and breathable engineered mesh upper for race-day speed and training-day comfort. Unisex sizing.",
        categoryUrl: "fashion-apparel",
        subCategoryUrl: "footwear",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: true,
        variants: [
            {
                variantName: "Black Neon",
                variantDescription: "Bold black base with neon yellow accents.",
                keywords: "running shoe,carbon plate,performance,unisex",
                weight: 0.28,
                isSale: false,
                specs: [
                    { name: "Drop", value: "8 mm" },
                    { name: "Midsole", value: "Dual-layer EVA" },
                    { name: "Upper", value: "Engineered mesh" },
                ],
                sizes: [
                    { size: "UK 5", price: 159.99, discount: 0, quantity: 15 },
                    { size: "UK 6", price: 159.99, discount: 0, quantity: 20 },
                    { size: "UK 7", price: 159.99, discount: 0, quantity: 25 },
                    { size: "UK 8", price: 159.99, discount: 0, quantity: 30 },
                    { size: "UK 9", price: 159.99, discount: 0, quantity: 28 },
                    { size: "UK 10", price: 159.99, discount: 0, quantity: 22 },
                    { size: "UK 11", price: 159.99, discount: 0, quantity: 15 },
                ],
                imageSeeds: ["cloudrun-pro-blackneon-side", "cloudrun-pro-blackneon-sole", "cloudrun-pro-blackneon-top"],
            },
            {
                variantName: "All White",
                variantDescription: "Clean all-white colourway for a minimal look.",
                keywords: "running shoe,carbon plate,performance,white",
                weight: 0.28,
                isSale: true,
                specs: [
                    { name: "Drop", value: "8 mm" },
                    { name: "Midsole", value: "Dual-layer EVA" },
                ],
                sizes: [
                    { size: "UK 6", price: 159.99, discount: 10, quantity: 15 },
                    { size: "UK 7", price: 159.99, discount: 10, quantity: 20 },
                    { size: "UK 8", price: 159.99, discount: 10, quantity: 25 },
                    { size: "UK 9", price: 159.99, discount: 10, quantity: 20 },
                ],
                imageSeeds: ["cloudrun-pro-white-side", "cloudrun-pro-white-sole"],
            },
        ],
    },
    {
        name: "Chelsea Leather Boot",
        brand: "Cobbleston",
        description:
            "Genuine full-grain leather Chelsea boot with elastic side panels, pull tabs, and a cushioned insole. Resoleable Goodyear welt construction.",
        categoryUrl: "fashion-apparel",
        subCategoryUrl: "footwear",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Dark Tan",
                variantDescription: "Rich dark tan that develops a beautiful patina over time.",
                keywords: "chelsea boot,leather,goodyear welt,men,women",
                weight: 0.9,
                isSale: false,
                specs: [
                    { name: "Upper", value: "Full-grain leather" },
                    { name: "Sole", value: "Rubber, Goodyear welt" },
                ],
                sizes: [
                    { size: "UK 4", price: 219.99, discount: 0, quantity: 10 },
                    { size: "UK 5", price: 219.99, discount: 0, quantity: 15 },
                    { size: "UK 6", price: 219.99, discount: 0, quantity: 20 },
                    { size: "UK 7", price: 219.99, discount: 0, quantity: 25 },
                    { size: "UK 8", price: 219.99, discount: 0, quantity: 22 },
                    { size: "UK 9", price: 219.99, discount: 0, quantity: 18 },
                    { size: "UK 10", price: 219.99, discount: 0, quantity: 12 },
                ],
                imageSeeds: ["cobbleston-chelsea-tan-side", "cobbleston-chelsea-tan-back", "cobbleston-chelsea-tan-sole"],
            },
        ],
    },
    {
        name: "Canvas Low-Top Sneaker",
        brand: "Streetbox",
        description:
            "Timeless low-top canvas sneaker with vulcanised rubber sole. A wardrobe staple that pairs with jeans, chinos, or shorts effortlessly.",
        categoryUrl: "fashion-apparel",
        subCategoryUrl: "footwear",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Natural White",
                variantDescription: "Off-white canvas with a classic look.",
                keywords: "sneaker,canvas,low-top,casual,unisex",
                weight: 0.35,
                isSale: false,
                specs: [
                    { name: "Upper", value: "Canvas" },
                    { name: "Sole", value: "Vulcanised rubber" },
                ],
                sizes: [
                    { size: "UK 4", price: 44.99, discount: 0, quantity: 35 },
                    { size: "UK 5", price: 44.99, discount: 0, quantity: 40 },
                    { size: "UK 6", price: 44.99, discount: 0, quantity: 45 },
                    { size: "UK 7", price: 44.99, discount: 0, quantity: 40 },
                    { size: "UK 8", price: 44.99, discount: 0, quantity: 35 },
                    { size: "UK 9", price: 44.99, discount: 0, quantity: 25 },
                ],
                imageSeeds: ["streetbox-canvas-white-side", "streetbox-canvas-white-top"],
            },
            {
                variantName: "Classic Black",
                variantDescription: "All-black colourway for bold street style.",
                keywords: "sneaker,canvas,low-top,casual,black",
                weight: 0.35,
                isSale: false,
                specs: [{ name: "Upper", value: "Canvas" }],
                sizes: [
                    { size: "UK 4", price: 44.99, discount: 0, quantity: 30 },
                    { size: "UK 5", price: 44.99, discount: 0, quantity: 35 },
                    { size: "UK 6", price: 44.99, discount: 0, quantity: 40 },
                    { size: "UK 7", price: 44.99, discount: 0, quantity: 38 },
                    { size: "UK 8", price: 44.99, discount: 0, quantity: 30 },
                ],
                imageSeeds: ["streetbox-canvas-black-side", "streetbox-canvas-black-top"],
            },
        ],
    },

    // ── FASHION › BAGS ─────────────────────────────────────────────────────
    {
        name: "Full-Grain Leather Tote",
        brand: "Maison Porte",
        description:
            "Spacious hand-stitched full-grain leather tote with a zippered interior pocket, magnetic snap, and detachable leather strap. Built to last decades.",
        categoryUrl: "fashion-apparel",
        subCategoryUrl: "bags-accessories",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Cognac Brown",
                variantDescription: "Rich cognac brown that ages beautifully.",
                keywords: "tote bag,leather,women,handbag",
                weight: 0.85,
                isSale: false,
                specs: [
                    { name: "Material", value: "Full-grain leather" },
                    { name: "Dimensions", value: "38 x 30 x 12 cm" },
                ],
                sizes: [{ size: "One Size", price: 189.99, discount: 0, quantity: 35 }],
                imageSeeds: ["maison-tote-cognac-front", "maison-tote-cognac-open", "maison-tote-cognac-detail"],
            },
            {
                variantName: "Jet Black",
                variantDescription: "Polished jet black for a sleek, professional look.",
                keywords: "tote bag,leather,women,handbag,black",
                weight: 0.85,
                isSale: false,
                specs: [{ name: "Material", value: "Full-grain leather" }],
                sizes: [{ size: "One Size", price: 189.99, discount: 0, quantity: 28 }],
                imageSeeds: ["maison-tote-black-front", "maison-tote-black-open"],
            },
        ],
    },
    {
        name: "Urban Commuter Backpack 25L",
        brand: "PeakPack",
        description:
            "Water-resistant nylon backpack with a padded 16-inch laptop compartment, USB-A pass-through port, and ergonomic shoulder straps. Perfect for commuters.",
        categoryUrl: "fashion-apparel",
        subCategoryUrl: "bags-accessories",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Slate Grey",
                variantDescription: "Professional slate grey for daily commutes.",
                keywords: "backpack,laptop bag,commuter,travel,25l",
                weight: 0.75,
                isSale: false,
                specs: [
                    { name: "Capacity", value: "25 L" },
                    { name: "Laptop Fit", value: 'Up to 16"' },
                    { name: "Material", value: "1000D Nylon" },
                ],
                sizes: [{ size: "One Size", price: 79.99, discount: 0, quantity: 65 }],
                imageSeeds: ["peakpack-urban-grey-front", "peakpack-urban-grey-side", "peakpack-urban-grey-open"],
            },
        ],
    },

    // ── HOME & LIVING › FURNITURE ──────────────────────────────────────────
    {
        name: "Nordic Oak Side Table",
        brand: "Nordhaus",
        description:
            "Solid Scandinavian oak side table with tapered legs and a minimalist aesthetic. Pre-assembled, easy to lift, and ships in protective packaging.",
        categoryUrl: "home-living",
        subCategoryUrl: "furniture-decor",
        shippingFeeMethod: ShippingFeeMethod.FIXED,
        freeShipping: false,
        variants: [
            {
                variantName: "Natural Oak",
                variantDescription: "Natural oak finish that brightens any room.",
                keywords: "side table,oak,nordic,scandinavian,furniture",
                weight: 4.5,
                isSale: false,
                specs: [
                    { name: "Material", value: "Solid oak" },
                    { name: "Dimensions", value: "45 x 45 x 55 cm" },
                ],
                sizes: [{ size: "One Size", price: 149.99, discount: 0, quantity: 20 }],
                imageSeeds: ["nordhaus-sidetable-oak-front", "nordhaus-sidetable-oak-angle"],
            },
            {
                variantName: "Walnut",
                variantDescription: "Dark walnut for a warmer, more dramatic look.",
                keywords: "side table,walnut,nordic,furniture",
                weight: 4.5,
                isSale: false,
                specs: [{ name: "Material", value: "Solid walnut" }],
                sizes: [{ size: "One Size", price: 169.99, discount: 0, quantity: 15 }],
                imageSeeds: ["nordhaus-sidetable-walnut-front", "nordhaus-sidetable-walnut-angle"],
            },
        ],
    },
    {
        name: "Borosilicate Glass Terrarium Dome",
        brand: "GreenGlobe",
        description:
            "Hand-blown borosilicate glass dome with a bamboo base. Perfect for displaying succulents, air plants, or decorative moss in style.",
        categoryUrl: "home-living",
        subCategoryUrl: "furniture-decor",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Clear Glass",
                variantDescription: "Crystal-clear glass dome with bamboo base.",
                keywords: "terrarium,glass dome,plants,decor,home",
                weight: 0.8,
                isSale: false,
                specs: [
                    { name: "Material", value: "Borosilicate glass + bamboo" },
                ],
                sizes: [
                    { size: "Small 15 cm", price: 34.99, discount: 0, quantity: 50 },
                    { size: "Medium 20 cm", price: 44.99, discount: 0, quantity: 40 },
                    { size: "Large 25 cm", price: 54.99, discount: 0, quantity: 30 },
                ],
                imageSeeds: ["greenglobe-dome-clear-front", "greenglobe-dome-clear-inside"],
            },
        ],
    },

    // ── HOME & LIVING › KITCHEN ────────────────────────────────────────────
    {
        name: "Ceramic Pour-Over Coffee Set",
        brand: "BrewForm",
        description:
            "Handmade ceramic pour-over dripper and matching server in a matte glaze. The conical design ensures even extraction for a perfectly balanced cup.",
        categoryUrl: "home-living",
        subCategoryUrl: "kitchen-dining",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Matte Slate",
                variantDescription: "Matte slate glaze with subtle texture.",
                keywords: "coffee,pour-over,ceramic,dripper,kitchen",
                weight: 0.65,
                isSale: false,
                specs: [
                    { name: "Material", value: "Stoneware ceramic" },
                    { name: "Capacity", value: "600 mL server" },
                ],
                sizes: [{ size: "One Size", price: 54.99, discount: 0, quantity: 45 }],
                imageSeeds: ["brewform-pourover-slate-front", "brewform-pourover-slate-pouring"],
            },
            {
                variantName: "Warm White",
                variantDescription: "Warm off-white glaze that feels at home in any kitchen.",
                keywords: "coffee,pour-over,ceramic,white,kitchen",
                weight: 0.65,
                isSale: false,
                specs: [{ name: "Material", value: "Stoneware ceramic" }],
                sizes: [{ size: "One Size", price: 54.99, discount: 0, quantity: 40 }],
                imageSeeds: ["brewform-pourover-white-front", "brewform-pourover-white-top"],
            },
        ],
    },
    {
        name: "Pre-Seasoned Cast Iron Skillet",
        brand: "IronKing",
        description:
            "Pre-seasoned 10-inch cast iron skillet. Retains heat like no other pan, safe on induction and in the oven up to 500 degrees. Practically indestructible.",
        categoryUrl: "home-living",
        subCategoryUrl: "kitchen-dining",
        shippingFeeMethod: ShippingFeeMethod.FIXED,
        freeShipping: false,
        variants: [
            {
                variantName: "Classic Black",
                variantDescription: "Classic pre-seasoned black cast iron.",
                keywords: "skillet,cast iron,cookware,oven safe,induction",
                weight: 2.6,
                isSale: false,
                specs: [
                    { name: "Material", value: "Cast iron" },
                    { name: "Diameter", value: "10 inch" },
                    { name: "Oven Safe", value: "Up to 500 C" },
                ],
                sizes: [
                    { size: "10 inch", price: 49.99, discount: 0, quantity: 75 },
                    { size: "12 inch", price: 64.99, discount: 0, quantity: 55 },
                ],
                imageSeeds: ["ironking-skillet-black-front", "ironking-skillet-black-inside"],
            },
        ],
    },
    {
        name: "Stainless Steel Knife Block Set",
        brand: "KnifeHaus",
        description:
            "7-piece German stainless steel knife set with a solid acacia wood block. Full-tang blades, triple-riveted handles, and razor-sharp edges out of the box.",
        categoryUrl: "home-living",
        subCategoryUrl: "kitchen-dining",
        shippingFeeMethod: ShippingFeeMethod.FIXED,
        freeShipping: false,
        variants: [
            {
                variantName: "Silver with Acacia Block",
                variantDescription: "Classic stainless steel with warm acacia wood block.",
                keywords: "knife set,kitchen,stainless steel,block,german",
                weight: 3.2,
                isSale: false,
                specs: [
                    { name: "Pieces", value: "7" },
                    { name: "Steel", value: "German 1.4116" },
                    { name: "Handle", value: "Triple-riveted" },
                ],
                sizes: [{ size: "7-Piece Set", price: 119.99, discount: 0, quantity: 30 }],
                imageSeeds: ["knifehaus-block-silver-acacia-front", "knifehaus-block-silver-acacia-open"],
            },
        ],
    },

    // ── HOME & LIVING › BEDDING ────────────────────────────────────────────
    {
        name: "Egyptian Cotton Duvet Set",
        brand: "DreamThread",
        description:
            "800 thread count Egyptian cotton duvet cover and two pillowcases. Cool-touch, hypoallergenic, and machine washable. Zip closure with interior ties.",
        categoryUrl: "home-living",
        subCategoryUrl: "bedding-bath",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: true,
        variants: [
            {
                variantName: "Pure White",
                variantDescription: "Crisp pure white for a hotel-fresh feel.",
                keywords: "duvet,bedding,egyptian cotton,luxury,white",
                weight: 1.2,
                isSale: false,
                specs: [
                    { name: "Thread Count", value: "800" },
                    { name: "Material", value: "100% Egyptian cotton" },
                ],
                sizes: [
                    { size: "Single", price: 69.99, discount: 0, quantity: 30 },
                    { size: "Double", price: 84.99, discount: 0, quantity: 35 },
                    { size: "King", price: 99.99, discount: 0, quantity: 28 },
                    { size: "Super King", price: 114.99, discount: 0, quantity: 18 },
                ],
                imageSeeds: ["dreamthread-duvet-white-flat", "dreamthread-duvet-white-detail"],
            },
            {
                variantName: "Dove Grey",
                variantDescription: "Soft dove grey for a calming bedroom aesthetic.",
                keywords: "duvet,bedding,egyptian cotton,grey",
                weight: 1.2,
                isSale: true,
                specs: [{ name: "Thread Count", value: "800" }],
                sizes: [
                    { size: "Single", price: 69.99, discount: 15, quantity: 25 },
                    { size: "Double", price: 84.99, discount: 15, quantity: 30 },
                    { size: "King", price: 99.99, discount: 15, quantity: 22 },
                ],
                imageSeeds: ["dreamthread-duvet-grey-flat", "dreamthread-duvet-grey-detail"],
            },
        ],
    },
    {
        name: "Bamboo Bath Towel Set",
        brand: "SoftRiver",
        description:
            "Set of 4 ultra-soft bamboo-blend bath towels. Quick-drying, odour-resistant, and buttery-smooth against the skin. Stays soft after hundreds of washes.",
        categoryUrl: "home-living",
        subCategoryUrl: "bedding-bath",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Ivory White",
                variantDescription: "Clean ivory white, matches any bathroom.",
                keywords: "towel,bamboo,bath,set,soft",
                weight: 1.4,
                isSale: false,
                specs: [
                    { name: "Material", value: "70% bamboo / 30% cotton" },
                    { name: "Set", value: "4 towels" },
                ],
                sizes: [{ size: "4-Piece Set", price: 49.99, discount: 0, quantity: 60 }],
                imageSeeds: ["softriver-towel-ivory-folded", "softriver-towel-ivory-hung"],
            },
            {
                variantName: "Sage Green",
                variantDescription: "Calming sage green for a spa-like bathroom.",
                keywords: "towel,bamboo,bath,set,green",
                weight: 1.4,
                isSale: false,
                specs: [{ name: "Material", value: "70% bamboo / 30% cotton" }],
                sizes: [{ size: "4-Piece Set", price: 49.99, discount: 0, quantity: 50 }],
                imageSeeds: ["softriver-towel-sage-folded", "softriver-towel-sage-hung"],
            },
        ],
    },

    // ── SPORTS & OUTDOORS ───────────────────────────────────────────────────
    {
        name: "Adjustable Dumbbell Set",
        brand: "IronPulse",
        description:
            "Dial-select adjustable dumbbell pair, replacing 15 sets of weights. Quick 2-second adjustment from 2.5 kg to 24 kg. Compact tray storage included.",
        categoryUrl: "sports-outdoors",
        subCategoryUrl: "fitness-equipment",
        shippingFeeMethod: ShippingFeeMethod.FIXED,
        freeShipping: false,
        variants: [
            {
                variantName: "Standard Pair",
                variantDescription: "Pair with storage tray.",
                keywords: "dumbbell,adjustable,home gym,weights,fitness",
                weight: 50,
                isSale: false,
                specs: [
                    { name: "Weight Range", value: "2.5 to 24 kg per dumbbell" },
                    { name: "Increment", value: "2.5 kg" },
                ],
                sizes: [{ size: "2.5 to 24 kg Pair", price: 349.99, discount: 0, quantity: 25 }],
                imageSeeds: ["ironpulse-dumbbell-adj-pair", "ironpulse-dumbbell-adj-tray", "ironpulse-dumbbell-adj-detail"],
            },
        ],
    },
    {
        name: "Yoga Mat Pro 6mm",
        brand: "FlowForm",
        description:
            "Non-slip natural rubber yoga mat with an eco-friendly PU top layer, alignment guide print, and carrying strap. 6 mm thick for joint cushioning.",
        categoryUrl: "sports-outdoors",
        subCategoryUrl: "fitness-equipment",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Deep Purple",
                variantDescription: "Calming deep purple with silver alignment lines.",
                keywords: "yoga mat,rubber,non-slip,6mm,eco",
                weight: 1.5,
                isSale: false,
                specs: [
                    { name: "Material", value: "Natural rubber + PU" },
                    { name: "Thickness", value: "6 mm" },
                    { name: "Dimensions", value: "183 x 66 cm" },
                ],
                sizes: [{ size: "One Size", price: 69.99, discount: 0, quantity: 80 }],
                imageSeeds: ["flowform-yoga-purple-rolled", "flowform-yoga-purple-flat"],
            },
            {
                variantName: "Forest Green",
                variantDescription: "Earthy forest green for a grounded practice.",
                keywords: "yoga mat,rubber,non-slip,green",
                weight: 1.5,
                isSale: false,
                specs: [{ name: "Material", value: "Natural rubber + PU" }],
                sizes: [{ size: "One Size", price: 69.99, discount: 0, quantity: 70 }],
                imageSeeds: ["flowform-yoga-green-rolled", "flowform-yoga-green-flat"],
            },
        ],
    },
    {
        name: "Resistance Band Set",
        brand: "FlexBand",
        description:
            "Set of 5 colour-coded loop resistance bands from 5 to 50 kg resistance. Made from natural latex, comes with a carry bag and exercise guide.",
        categoryUrl: "sports-outdoors",
        subCategoryUrl: "fitness-equipment",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "5-Band Set",
                variantDescription: "Full set of 5 bands in a carry bag.",
                keywords: "resistance bands,latex,home gym,workout,fitness",
                weight: 0.5,
                isSale: false,
                specs: [
                    { name: "Bands", value: "5" },
                    { name: "Range", value: "5 to 50 kg resistance" },
                    { name: "Material", value: "Natural latex" },
                ],
                sizes: [{ size: "5-Piece Set", price: 29.99, discount: 0, quantity: 150 }],
                imageSeeds: ["flexband-set-5-front", "flexband-set-5-bag"],
            },
        ],
    },
    {
        name: "3-Person Ultralight Tent",
        brand: "SummitCrest",
        description:
            "2-pole freestanding tent with a 3000 mm waterproof rating, taped seams, and a full-coverage fly. Sets up in under 5 minutes. Weighs just 1.8 kg.",
        categoryUrl: "sports-outdoors",
        subCategoryUrl: "outdoor-camping",
        shippingFeeMethod: ShippingFeeMethod.FIXED,
        freeShipping: false,
        variants: [
            {
                variantName: "Olive Dark Grey",
                variantDescription: "Low-visibility olive and dark grey colourway.",
                keywords: "tent,camping,3 person,ultralight,waterproof",
                weight: 1.8,
                isSale: false,
                specs: [
                    { name: "Capacity", value: "3 Person" },
                    { name: "Weight", value: "1.8 kg" },
                    { name: "Waterproof", value: "3000 mm HH" },
                    { name: "Setup", value: "Under 5 min" },
                ],
                sizes: [{ size: "One Size", price: 279.99, discount: 0, quantity: 18 }],
                imageSeeds: ["summitcrest-tent-olive-front", "summitcrest-tent-olive-inside", "summitcrest-tent-olive-fly"],
            },
        ],
    },
    {
        name: "Vacuum Insulated Flask 750 mL",
        brand: "ThermaVault",
        description:
            "Double-wall vacuum-insulated stainless steel flask. Keeps drinks hot for 24 hours or cold for 48. Leakproof lid, wide mouth, BPA-free.",
        categoryUrl: "sports-outdoors",
        subCategoryUrl: "outdoor-camping",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Matte Black",
                variantDescription: "Durable powder-coated matte black.",
                keywords: "water bottle,flask,insulated,stainless steel,camping",
                weight: 0.4,
                isSale: false,
                specs: [
                    { name: "Capacity", value: "750 mL" },
                    { name: "Insulation", value: "24 h hot / 48 h cold" },
                    { name: "Material", value: "18/8 stainless steel" },
                ],
                sizes: [
                    { size: "500 mL", price: 32.99, discount: 0, quantity: 100 },
                    { size: "750 mL", price: 39.99, discount: 0, quantity: 120 },
                    { size: "1 L", price: 46.99, discount: 0, quantity: 80 },
                ],
                imageSeeds: ["thermavault-flask-black-front", "thermavault-flask-black-lid"],
            },
            {
                variantName: "Ocean Blue",
                variantDescription: "Vibrant ocean blue powder coat.",
                keywords: "water bottle,flask,insulated,blue",
                weight: 0.4,
                isSale: true,
                specs: [{ name: "Insulation", value: "24 h hot / 48 h cold" }],
                sizes: [
                    { size: "500 mL", price: 32.99, discount: 10, quantity: 80 },
                    { size: "750 mL", price: 39.99, discount: 10, quantity: 90 },
                ],
                imageSeeds: ["thermavault-flask-blue-front", "thermavault-flask-blue-lid"],
            },
        ],
    },
    {
        name: "Basketball Size 7",
        brand: "CourtKing",
        description:
            "Official size 7 indoor/outdoor basketball with composite leather cover and deep channel design for superior grip and consistent bounce.",
        categoryUrl: "sports-outdoors",
        subCategoryUrl: "team-sports",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Orange",
                variantDescription: "Classic orange with black channels.",
                keywords: "basketball,size 7,indoor,outdoor,composite",
                weight: 0.62,
                isSale: false,
                specs: [
                    { name: "Size", value: "7 (official)" },
                    { name: "Cover", value: "Composite leather" },
                    { name: "Suitable", value: "Indoor & outdoor" },
                ],
                sizes: [{ size: "Size 7", price: 39.99, discount: 0, quantity: 70 }],
                imageSeeds: ["courtking-basketball-orange-front", "courtking-basketball-orange-detail"],
            },
        ],
    },

    // ── HEALTH & BEAUTY ─────────────────────────────────────────────────────
    {
        name: "Vitamin C Brightening Serum",
        brand: "Luminos",
        description:
            "15 percent stabilised ascorbic acid with ferulic acid and vitamin E. Fades dark spots, boosts collagen, and leaves skin visibly brighter in 4 weeks.",
        categoryUrl: "health-beauty",
        subCategoryUrl: "skincare",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "30 mL",
                variantDescription: "Travel and starter size.",
                keywords: "vitamin c serum,brightening,skincare,anti-aging",
                weight: 0.08,
                isSale: false,
                specs: [
                    { name: "Active", value: "15% Ascorbic Acid" },
                    { name: "Skin Type", value: "All types" },
                ],
                sizes: [{ size: "30 mL", price: 34.99, discount: 0, quantity: 150 }],
                imageSeeds: ["luminos-vitc-serum-30-front", "luminos-vitc-serum-30-texture"],
            },
            {
                variantName: "60 mL",
                variantDescription: "Full-size bottle for regular users.",
                keywords: "vitamin c serum,brightening,skincare",
                weight: 0.12,
                isSale: false,
                specs: [{ name: "Active", value: "15% Ascorbic Acid" }],
                sizes: [{ size: "60 mL", price: 59.99, discount: 0, quantity: 100 }],
                imageSeeds: ["luminos-vitc-serum-60-front", "luminos-vitc-serum-60-texture"],
            },
        ],
    },
    {
        name: "Hyaluronic Acid Moisturiser",
        brand: "AquaDerm",
        description:
            "Oil-free, fragrance-free gel-cream with three molecular weights of hyaluronic acid for multi-depth hydration. Suitable for all skin types including sensitive.",
        categoryUrl: "health-beauty",
        subCategoryUrl: "skincare",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "50 mL",
                variantDescription: "Lightweight daily moisturiser.",
                keywords: "hyaluronic acid,moisturiser,hydration,skincare",
                weight: 0.1,
                isSale: false,
                specs: [
                    { name: "Type", value: "Gel-cream" },
                    { name: "Volume", value: "50 mL" },
                ],
                sizes: [{ size: "50 mL", price: 24.99, discount: 0, quantity: 180 }],
                imageSeeds: ["aquaderm-ha-cream-50-front", "aquaderm-ha-cream-50-texture"],
            },
            {
                variantName: "100 mL",
                variantDescription: "Jumbo size for at-home regular use.",
                keywords: "hyaluronic acid,moisturiser,hydration",
                weight: 0.18,
                isSale: false,
                specs: [{ name: "Type", value: "Gel-cream" }],
                sizes: [{ size: "100 mL", price: 39.99, discount: 0, quantity: 120 }],
                imageSeeds: ["aquaderm-ha-cream-100-front"],
            },
        ],
    },
    {
        name: "SPF50 Mineral Sunscreen",
        brand: "ShieldSkin",
        description:
            "Broad-spectrum SPF 50 mineral sunscreen with zinc oxide. Leaves no white cast, non-comedogenic, and reef-safe. Suitable for face and body.",
        categoryUrl: "health-beauty",
        subCategoryUrl: "skincare",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Face Formula",
                variantDescription: "Lightweight tinted formula for the face.",
                keywords: "sunscreen,spf50,mineral,zinc oxide,reef safe",
                weight: 0.09,
                isSale: false,
                specs: [
                    { name: "SPF", value: "50" },
                    { name: "Type", value: "Mineral (Zinc Oxide)" },
                    { name: "Volume", value: "50 mL" },
                ],
                sizes: [{ size: "50 mL", price: 22.99, discount: 0, quantity: 200 }],
                imageSeeds: ["shieldskin-spf50-face-front", "shieldskin-spf50-face-texture"],
            },
        ],
    },
    {
        name: "Omega-3 Fish Oil Capsules",
        brand: "VitaCore",
        description:
            "High-potency EPA/DHA fish oil, molecularly distilled for purity. Supports cardiovascular, brain, and joint health. No fishy aftertaste.",
        categoryUrl: "health-beauty",
        subCategoryUrl: "vitamins-supplements",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "90 Capsules",
                variantDescription: "One-month supply.",
                keywords: "omega-3,fish oil,EPA,DHA,supplements",
                weight: 0.25,
                isSale: false,
                specs: [
                    { name: "EPA per capsule", value: "540 mg" },
                    { name: "DHA per capsule", value: "360 mg" },
                    { name: "Capsules", value: "90" },
                ],
                sizes: [{ size: "90 Capsules", price: 19.99, discount: 0, quantity: 200 }],
                imageSeeds: ["vitamcore-omega3-90-bottle", "vitamcore-omega3-90-capsule"],
            },
            {
                variantName: "180 Capsules",
                variantDescription: "Two-month supply, best value.",
                keywords: "omega-3,fish oil,supplements,bulk",
                weight: 0.45,
                isSale: false,
                specs: [{ name: "Capsules", value: "180" }],
                sizes: [{ size: "180 Capsules", price: 34.99, discount: 0, quantity: 150 }],
                imageSeeds: ["vitamcore-omega3-180-bottle"],
            },
        ],
    },
    {
        name: "Whey Protein Powder",
        brand: "PeakFuel",
        description:
            "25 g of protein per serving from cold-processed whey concentrate. Low in sugar, excellent amino acid profile, and available in three flavours.",
        categoryUrl: "health-beauty",
        subCategoryUrl: "vitamins-supplements",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Chocolate Fudge",
                variantDescription: "Rich chocolate fudge flavour.",
                keywords: "protein powder,whey,chocolate,gym,fitness",
                weight: 1.0,
                isSale: false,
                specs: [
                    { name: "Protein per serving", value: "25 g" },
                    { name: "Servings", value: "30 per bag" },
                ],
                sizes: [
                    { size: "900 g", price: 44.99, discount: 0, quantity: 80 },
                    { size: "2 kg", price: 84.99, discount: 0, quantity: 50 },
                ],
                imageSeeds: ["peakfuel-whey-chocolate-bag", "peakfuel-whey-chocolate-scoop"],
            },
            {
                variantName: "Vanilla Cream",
                variantDescription: "Smooth vanilla cream flavour.",
                keywords: "protein powder,whey,vanilla,gym,fitness",
                weight: 1.0,
                isSale: false,
                specs: [{ name: "Protein per serving", value: "25 g" }],
                sizes: [
                    { size: "900 g", price: 44.99, discount: 0, quantity: 70 },
                    { size: "2 kg", price: 84.99, discount: 0, quantity: 40 },
                ],
                imageSeeds: ["peakfuel-whey-vanilla-bag", "peakfuel-whey-vanilla-scoop"],
            },
        ],
    },
    {
        name: "Electric Sonic Toothbrush",
        brand: "DentoPulse",
        description:
            "40,000 strokes per minute sonic motor, 5 cleaning modes, smart pressure sensor, and a 30-day battery life. Includes 2 brush heads.",
        categoryUrl: "health-beauty",
        subCategoryUrl: "personal-care",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Pearl White",
                variantDescription: "Classic pearl white with matte grip.",
                keywords: "toothbrush,electric,sonic,oral care,dentist",
                weight: 0.2,
                isSale: false,
                specs: [
                    { name: "Strokes per min", value: "40,000" },
                    { name: "Modes", value: "5" },
                    { name: "Battery", value: "30 days" },
                ],
                sizes: [{ size: "One Size", price: 59.99, discount: 0, quantity: 85 }],
                imageSeeds: ["dentopulse-sonic-white-front", "dentopulse-sonic-white-head", "dentopulse-sonic-white-charger"],
            },
        ],
    },

    // ── BOOKS & MEDIA ───────────────────────────────────────────────────────
    {
        name: "The Art of Deep Work",
        brand: "Meridian Press",
        description:
            "A practical guide to cultivating deep focus in a world of constant distraction. Backed by cognitive science and filled with actionable strategies.",
        categoryUrl: "books-media",
        subCategoryUrl: "books",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Hardcover",
                variantDescription: "Premium cloth-bound hardcover edition.",
                keywords: "book,productivity,focus,non-fiction,hardcover",
                weight: 0.5,
                isSale: false,
                specs: [
                    { name: "Format", value: "Hardcover" },
                    { name: "Pages", value: "320" },
                ],
                sizes: [{ size: "One Size", price: 22.99, discount: 0, quantity: 100 }],
                imageSeeds: ["artofdeepwork-hardcover-front", "artofdeepwork-hardcover-spine"],
            },
            {
                variantName: "Paperback",
                variantDescription: "Lightweight paperback for reading on the go.",
                keywords: "book,productivity,focus,non-fiction,paperback",
                weight: 0.3,
                isSale: false,
                specs: [
                    { name: "Format", value: "Paperback" },
                    { name: "Pages", value: "320" },
                ],
                sizes: [{ size: "One Size", price: 14.99, discount: 0, quantity: 150 }],
                imageSeeds: ["artofdeepwork-paperback-front"],
            },
        ],
    },
    {
        name: "Classical Guitar String Set",
        brand: "SilverNote",
        description:
            "Nylon/silver-wound classical guitar strings for warm, balanced tone. Trebles in clear nylon, basses in silver-plated copper.",
        categoryUrl: "books-media",
        subCategoryUrl: "music-instruments",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Normal Tension",
                variantDescription: "Ideal for fingerpicking and classical repertoire.",
                keywords: "guitar strings,classical,nylon,acoustic,music",
                weight: 0.05,
                isSale: false,
                specs: [
                    { name: "Trebles", value: "Clear nylon" },
                    { name: "Basses", value: "Silver-plated copper" },
                    { name: "Tension", value: "Normal" },
                ],
                sizes: [{ size: "One Size", price: 12.99, discount: 0, quantity: 200 }],
                imageSeeds: ["silvernote-strings-normal-pack", "silvernote-strings-normal-detail"],
            },
            {
                variantName: "Hard Tension",
                variantDescription: "More volume and projection for performance.",
                keywords: "guitar strings,classical,nylon,hard tension",
                weight: 0.05,
                isSale: false,
                specs: [{ name: "Tension", value: "Hard" }],
                sizes: [{ size: "One Size", price: 12.99, discount: 0, quantity: 160 }],
                imageSeeds: ["silvernote-strings-hard-pack"],
            },
        ],
    },
    {
        name: "Strategy Board Game",
        brand: "MindForge",
        description:
            "Award-winning 2 to 4 player strategy game where you build civilizations, research technologies, and engage in diplomacy or conflict. Ages 14+, 90 min average.",
        categoryUrl: "books-media",
        subCategoryUrl: "games-hobbies",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Standard Edition",
                variantDescription: "Base game with 200+ components.",
                keywords: "board game,strategy,civ,tabletop,2-4 players",
                weight: 1.8,
                isSale: false,
                specs: [
                    { name: "Players", value: "2 to 4" },
                    { name: "Play Time", value: "90 min avg" },
                    { name: "Age", value: "14+" },
                ],
                sizes: [{ size: "One Size", price: 54.99, discount: 0, quantity: 40 }],
                imageSeeds: ["mindforge-strategy-box-top", "mindforge-strategy-box-open", "mindforge-strategy-components"],
            },
            {
                variantName: "Deluxe Edition",
                variantDescription: "Includes metal coins, wooden tokens, and storage insert.",
                keywords: "board game,strategy,deluxe,premium,tabletop",
                weight: 2.4,
                isSale: false,
                specs: [
                    { name: "Players", value: "2 to 4" },
                    { name: "Extras", value: "Metal coins, wooden tokens" },
                ],
                sizes: [{ size: "One Size", price: 89.99, discount: 0, quantity: 20 }],
                imageSeeds: ["mindforge-strategy-deluxe-box", "mindforge-strategy-deluxe-tokens"],
            },
        ],
    },
    {
        name: "1000-Piece Landscape Puzzle",
        brand: "PuzzleCraft",
        description:
            "1000-piece jigsaw puzzle with a stunning mountain lake landscape. High-gloss print, precision-cut pieces that fit perfectly, and a keepsake storage box.",
        categoryUrl: "books-media",
        subCategoryUrl: "games-hobbies",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Mountain Lake",
                variantDescription: "Serene mountain lake at golden hour.",
                keywords: "puzzle,jigsaw,1000 pieces,landscape,hobby",
                weight: 0.85,
                isSale: false,
                specs: [
                    { name: "Pieces", value: "1000" },
                    { name: "Assembled Size", value: "50 x 70 cm" },
                ],
                sizes: [{ size: "One Size", price: 24.99, discount: 0, quantity: 80 }],
                imageSeeds: ["puzzlecraft-1000-mountain-box", "puzzlecraft-1000-mountain-assembled"],
            },
        ],
    },

    // ── BABY & KIDS ─────────────────────────────────────────────────────────
    {
        name: "STEM Building Block Set 500 Pieces",
        brand: "BrainBricks",
        description:
            "500-piece colourful STEM building blocks compatible with all major brick systems. Encourages creativity, spatial reasoning, and fine motor skills. Ages 4+.",
        categoryUrl: "baby-kids",
        subCategoryUrl: "toys-games",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Rainbow Mix",
                variantDescription: "500 bricks in 12 vibrant colours.",
                keywords: "building blocks,STEM,kids,toys,brick",
                weight: 0.9,
                isSale: false,
                specs: [
                    { name: "Pieces", value: "500" },
                    { name: "Age", value: "4+" },
                    { name: "Compatibility", value: "Universal" },
                ],
                sizes: [{ size: "500 Pieces", price: 29.99, discount: 0, quantity: 90 }],
                imageSeeds: ["brainbricks-500-rainbow-box", "brainbricks-500-rainbow-built"],
            },
        ],
    },
    {
        name: "Remote Control Off-Road Car",
        brand: "RushRC",
        description:
            "1:12 scale 4WD off-road RC car with 2.4 GHz remote, 30 km/h top speed, independent suspension, and a rechargeable 7.4 V battery for 30 minutes of runtime.",
        categoryUrl: "baby-kids",
        subCategoryUrl: "toys-games",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Red Racer",
                variantDescription: "Bold red racing livery.",
                keywords: "rc car,remote control,off-road,kids,4wd",
                weight: 1.2,
                isSale: false,
                specs: [
                    { name: "Scale", value: "1:12" },
                    { name: "Drive", value: "4WD" },
                    { name: "Top Speed", value: "30 km/h" },
                    { name: "Runtime", value: "30 min" },
                ],
                sizes: [{ size: "One Size", price: 59.99, discount: 0, quantity: 45 }],
                imageSeeds: ["rushrc-offroad-red-front", "rushrc-offroad-red-angle", "rushrc-offroad-red-remote"],
            },
        ],
    },
    {
        name: "Organic Cotton Baby Onesie Set",
        brand: "TenderWear",
        description:
            "Pack of 5 snap-bottom onesies in 100% GOTS-certified organic cotton. Rib-knit stretch fabric, flat-seam construction, and safe non-toxic dyes.",
        categoryUrl: "baby-kids",
        subCategoryUrl: "baby-essentials",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: true,
        variants: [
            {
                variantName: "Pastel Mix",
                variantDescription: "Five soft pastel colours.",
                keywords: "baby onesie,organic cotton,GOTS,newborn,baby clothes",
                weight: 0.3,
                isSale: false,
                specs: [
                    { name: "Material", value: "100% Organic cotton GOTS" },
                    { name: "Pack", value: "5 onesies" },
                ],
                sizes: [
                    { size: "0 to 3 months", price: 34.99, discount: 0, quantity: 60 },
                    { size: "3 to 6 months", price: 34.99, discount: 0, quantity: 55 },
                    { size: "6 to 9 months", price: 34.99, discount: 0, quantity: 50 },
                    { size: "9 to 12 months", price: 34.99, discount: 0, quantity: 45 },
                ],
                imageSeeds: ["tenderwear-onesie-pastel-set", "tenderwear-onesie-pastel-detail"],
            },
        ],
    },
    {
        name: "Kids Waterproof Rain Jacket",
        brand: "PuddleJump",
        description:
            "Fully waterproof and taped-seam rain jacket with a breathable lining, pack-away hood, and reflective strips. Makes rainy days the best days.",
        categoryUrl: "baby-kids",
        subCategoryUrl: "kids-fashion",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Bright Red",
                variantDescription: "Bold bright red so little ones are easy to spot.",
                keywords: "rain jacket,kids,waterproof,outdoor,children",
                weight: 0.4,
                isSale: false,
                specs: [
                    { name: "Waterproof", value: "10,000 mm HH" },
                    { name: "Seams", value: "Fully taped" },
                    { name: "Reflective", value: "Yes" },
                ],
                sizes: [
                    { size: "2 to 3 years", price: 44.99, discount: 0, quantity: 35 },
                    { size: "4 to 5 years", price: 44.99, discount: 0, quantity: 40 },
                    { size: "6 to 7 years", price: 49.99, discount: 0, quantity: 35 },
                    { size: "8 to 9 years", price: 49.99, discount: 0, quantity: 30 },
                    { size: "10 to 11 years", price: 54.99, discount: 0, quantity: 25 },
                ],
                imageSeeds: ["puddlejump-jacket-red-front", "puddlejump-jacket-red-detail"],
            },
            {
                variantName: "Navy Blue",
                variantDescription: "Classic navy blue for a smarter look.",
                keywords: "rain jacket,kids,waterproof,navy,children",
                weight: 0.4,
                isSale: false,
                specs: [{ name: "Waterproof", value: "10,000 mm HH" }],
                sizes: [
                    { size: "2 to 3 years", price: 44.99, discount: 0, quantity: 28 },
                    { size: "4 to 5 years", price: 44.99, discount: 0, quantity: 32 },
                    { size: "6 to 7 years", price: 49.99, discount: 0, quantity: 28 },
                    { size: "8 to 9 years", price: 49.99, discount: 0, quantity: 22 },
                ],
                imageSeeds: ["puddlejump-jacket-navy-front", "puddlejump-jacket-navy-detail"],
            },
        ],
    },

    // ── AUTOMOTIVE ──────────────────────────────────────────────────────────
    {
        name: "Wireless Car Phone Mount",
        brand: "DriveTech",
        description:
            "15 W MagSafe-compatible magnetic wireless charger with a one-touch vent clip. Supports portrait and landscape orientation for any GPS or media app.",
        categoryUrl: "automotive",
        subCategoryUrl: "car-accessories",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Black",
                variantDescription: "Matte black finish, blends with any interior.",
                keywords: "car mount,wireless charger,magsafe,phone holder,driving",
                weight: 0.15,
                isSale: false,
                specs: [
                    { name: "Charging", value: "15 W wireless" },
                    { name: "Compatibility", value: "MagSafe + Qi" },
                ],
                sizes: [{ size: "One Size", price: 44.99, discount: 0, quantity: 110 }],
                imageSeeds: ["drivetech-mount-black-front", "drivetech-mount-black-installed"],
            },
        ],
    },
    {
        name: "Dash Camera 4K",
        brand: "SafeView",
        description:
            "4K front dash camera with Sony STARVIS sensor, built-in GPS, 140 degree wide-angle lens, and loop recording. Captures every detail day and night.",
        categoryUrl: "automotive",
        subCategoryUrl: "car-accessories",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Front Only",
                variantDescription: "4K front camera with GPS.",
                keywords: "dash cam,4k,gps,car camera,safety",
                weight: 0.22,
                isSale: false,
                specs: [
                    { name: "Resolution", value: "4K 30fps" },
                    { name: "Field of View", value: "140 degrees" },
                    { name: "GPS", value: "Built-in" },
                ],
                sizes: [{ size: "One Size", price: 89.99, discount: 0, quantity: 50 }],
                imageSeeds: ["safeview-dashcam-front-only", "safeview-dashcam-front-mounted"],
            },
            {
                variantName: "Front + Rear",
                variantDescription: "4K front and 1080p rear dual camera kit.",
                keywords: "dash cam,4k,dual channel,front rear,safety",
                weight: 0.38,
                isSale: false,
                specs: [
                    { name: "Front", value: "4K 30fps" },
                    { name: "Rear", value: "1080p 30fps" },
                ],
                sizes: [{ size: "One Size", price: 129.99, discount: 0, quantity: 35 }],
                imageSeeds: ["safeview-dashcam-dual-front", "safeview-dashcam-dual-rear"],
            },
        ],
    },
    {
        name: "72-Piece Auto Tool Set",
        brand: "ProGrip",
        description:
            "72-piece chrome vanadium tool set in a blow-moulded carry case. Includes ratchet, sockets, spanners, screwdrivers, pliers, and hex keys for any job.",
        categoryUrl: "automotive",
        subCategoryUrl: "tools-equipment",
        shippingFeeMethod: ShippingFeeMethod.FIXED,
        freeShipping: false,
        variants: [
            {
                variantName: "Standard Set",
                variantDescription: "All-in-one set in a hard carry case.",
                keywords: "tool set,toolbox,72 piece,chrome vanadium,automotive,diy",
                weight: 5.5,
                isSale: false,
                specs: [
                    { name: "Pieces", value: "72" },
                    { name: "Material", value: "Chrome vanadium" },
                    { name: "Case", value: "Blow-moulded" },
                ],
                sizes: [{ size: "One Size", price: 89.99, discount: 0, quantity: 30 }],
                imageSeeds: ["progrip-toolset-72-open", "progrip-toolset-72-closed", "progrip-toolset-72-detail"],
            },
        ],
    },
    {
        name: "Tyre Inflator Portable",
        brand: "AirBoost",
        description:
            "Compact cordless tyre inflator with digital pressure gauge, automatic shut-off at target PSI, and built-in LED light. Charges via USB-C.",
        categoryUrl: "automotive",
        subCategoryUrl: "tools-equipment",
        shippingFeeMethod: ShippingFeeMethod.ITEM,
        freeShipping: false,
        variants: [
            {
                variantName: "Black",
                variantDescription: "Compact black unit with LED.",
                keywords: "tyre inflator,air pump,portable,cordless,usb-c",
                weight: 0.55,
                isSale: false,
                specs: [
                    { name: "Max Pressure", value: "150 PSI" },
                    { name: "Auto Shut-off", value: "Yes" },
                    { name: "Charging", value: "USB-C" },
                ],
                sizes: [{ size: "One Size", price: 49.99, discount: 0, quantity: 70 }],
                imageSeeds: ["airboost-inflator-black-front", "airboost-inflator-black-display"],
            },
        ],
    },
];

// ─── review templates ────────────────────────────────────────────────────────

const REVIEW_TEMPLATES = [
    { rating: 5, review: "Absolutely love this product. Exceeded every expectation and arrived well-packaged.", color: "As Shown", quantity: "1" },
    { rating: 5, review: "Best purchase I have made this year. Quality is outstanding and shipping was fast.", color: "Accurate", quantity: "1" },
    { rating: 5, review: "Highly recommend to anyone considering this. Top-notch build quality and great value.", color: "Exactly as pictured", quantity: "2" },
    { rating: 4, review: "Really solid product. Minor cosmetic issue on arrival but overall very happy with it.", color: "Matches listing", quantity: "1" },
    { rating: 4, review: "Great quality for the price. Would order again and recommend to friends.", color: "Good colour match", quantity: "1" },
    { rating: 4, review: "Arrived quickly and well packaged. Works exactly as described.", color: "As expected", quantity: "1" },
    { rating: 3, review: "Decent product but took longer than expected to arrive. Quality is acceptable.", color: "Slightly different shade", quantity: "1" },
    { rating: 5, review: "Perfect gift. The recipient absolutely loved it. Will be back for more.", color: "Lovely colour", quantity: "1" },
    { rating: 5, review: "Second time ordering this. Consistently great quality every time.", color: "Consistent", quantity: "2" },
    { rating: 4, review: "Good product, the instructions could be clearer but the end result is excellent.", color: "As pictured", quantity: "1" },
    { rating: 5, review: "Surpassed my expectations. The materials feel very high-end for the price.", color: "Beautiful shade", quantity: "1" },
    { rating: 3, review: "Average quality but does the job. Shipping was quicker than I anticipated.", color: "OK", quantity: "1" },
    { rating: 4, review: "Solid item, looks great. Packing was secure and arrived without damage.", color: "True to images", quantity: "1" },
    { rating: 5, review: "Fantastic! My whole family is impressed. Will definitely order more from this store.", color: "Vibrant and accurate", quantity: "3" },
    { rating: 5, review: "Extremely satisfied. Everything I wanted and more. The craftsmanship is superb.", color: "Spot on", quantity: "1" },
    { rating: 4, review: "Good value. Took a few days to figure out the setup but works great now.", color: "Good", quantity: "1" },
    { rating: 5, review: "This is my third purchase from this seller. Never been let down. Five stars every time.", color: "Perfect", quantity: "1" },
    { rating: 4, review: "Does exactly what it says. Fast delivery and well packaged. Happy customer.", color: "True to listing", quantity: "1" },
];

// ─── store resolver ───────────────────────────────────────────────────────────

async function resolveStore() {
    const existing = await db.store.findFirst({
        where: { status: StoreStatus.ACTIVE },
        select: { id: true, url: true, userId: true },
        orderBy: { createdAt: "asc" },
    });

    if (existing) {
        console.log(`Using store: ${existing.url}`);
        return existing;
    }

    const seller = await db.user.upsert({
        where: { email: "showcase@gocart.store" },
        update: {},
        create: {
            name: "GoCart Showcase",
            email: "showcase@gocart.store",
            role: Role.SELLER,
            picture: "https://picsum.photos/seed/showcase-seller/160/160",
        },
    });

    const store = await db.store.upsert({
        where: { url: "gocart-showcase" },
        update: { status: StoreStatus.ACTIVE },
        create: {
            userId: seller.id,
            name: "GoCart Showcase Store",
            description: "Our curated showcase of quality products across every category.",
            email: "showcase+store@gocart.store",
            phone: "+15550002000",
            url: "gocart-showcase",
            logo: "https://picsum.photos/seed/gocart-showcase-logo/200/200",
            cover: "https://picsum.photos/seed/gocart-showcase-cover/1200/400",
            status: StoreStatus.ACTIVE,
        },
    });

    console.log(`Created store: ${store.url}`);
    return { id: store.id, url: store.url, userId: seller.id };
}

// ─── taxonomy upsert ─────────────────────────────────────────────────────────

async function upsertTaxonomy() {
    const categoryMap = new Map<string, string>();
    const subCategoryMap = new Map<string, string>();

    for (const entry of TAXONOMY) {
        const cat = await db.category.upsert({
            where: { url: entry.category.url },
            update: {},
            create: {
                name: entry.category.name,
                url: entry.category.url,
                image: `https://picsum.photos/seed/cat-${entry.category.url}/600/400`,
                featured: true,
            },
        });
        categoryMap.set(entry.category.url, cat.id);

        for (const sub of entry.subCategories) {
            const subCat = await db.subCategory.upsert({
                where: { url: sub.url },
                update: {},
                create: {
                    name: sub.name,
                    url: sub.url,
                    image: `https://picsum.photos/seed/sub-${sub.url}/600/400`,
                    categoryId: cat.id,
                    featured: true,
                },
            });
            subCategoryMap.set(sub.url, subCat.id);
        }
    }

    return { categoryMap, subCategoryMap };
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
    console.log("Starting product seed against production database...\n");

    const store = await resolveStore();
    const { categoryMap, subCategoryMap } = await upsertTaxonomy();

    const users = await db.user.findMany({ select: { id: true }, take: 30 });

    let seededProducts = 0;
    let seededVariants = 0;
    let seededReviews = 0;

    for (const def of PRODUCTS) {
        const categoryId = categoryMap.get(def.categoryUrl);
        const subCategoryId = subCategoryMap.get(def.subCategoryUrl);

        if (!categoryId || !subCategoryId) {
            console.warn(`Skipping "${def.name}": missing category/subcategory`);
            continue;
        }

        const productSlug = slugify(def.name);

        const product = await db.product.upsert({
            where: { slug: productSlug },
            update: {
                name: def.name,
                description: def.description,
                brand: def.brand,
                categoryId,
                subCategoryId,
                shippingFeeMethod: def.shippingFeeMethod,
                freeShippingForAllCountries: def.freeShipping,
            },
            create: {
                name: def.name,
                slug: productSlug,
                description: def.description,
                brand: def.brand,
                storeId: store.id,
                categoryId,
                subCategoryId,
                shippingFeeMethod: def.shippingFeeMethod,
                freeShippingForAllCountries: def.freeShipping,
            },
        });

        seededProducts += 1;

        for (let vi = 0; vi < def.variants.length; vi++) {
            const v = def.variants[vi];
            const variantSlug = `${productSlug}-${slugify(v.variantName)}`;

            const variant = await db.productVariant.upsert({
                where: { slug: variantSlug },
                update: {
                    variantName: v.variantName,
                    variantDescription: v.variantDescription ?? null,
                    keywords: v.keywords,
                    isSale: v.isSale,
                },
                create: {
                    variantName: v.variantName,
                    variantDescription: v.variantDescription ?? null,
                    variantImage: `https://picsum.photos/seed/${v.imageSeeds[0]}/640/640`,
                    slug: variantSlug,
                    sku: `${productSlug.toUpperCase().replace(/-/g, "").slice(0, 10)}-V${vi + 1}`,
                    keywords: v.keywords,
                    isSale: v.isSale,
                    weight: v.weight,
                    productId: product.id,
                },
            });

            // Images — only insert if none exist yet
            const imgCount = await db.productVariantImage.count({ where: { productVariantId: variant.id } });
            if (imgCount === 0) {
                await db.productVariantImage.createMany({
                    data: v.imageSeeds.map((seed, order) => ({
                        url: `https://picsum.photos/seed/${seed}/640/640`,
                        alt: `${def.name} — ${v.variantName} view ${order + 1}`,
                        order,
                        productVariantId: variant.id,
                    })),
                });
            }

            // Sizes
            for (const s of v.sizes) {
                const existing = await db.size.findFirst({
                    where: { productVariantId: variant.id, size: s.size },
                    select: { id: true },
                });
                if (existing) {
                    await db.size.update({
                        where: { id: existing.id },
                        data: { price: s.price, discount: s.discount, quantity: s.quantity },
                    });
                } else {
                    await db.size.create({
                        data: {
                            size: s.size,
                            price: s.price,
                            discount: s.discount,
                            quantity: s.quantity,
                            lowStockThreshold: 5,
                            productVariantId: variant.id,
                        },
                    });
                }
            }

            // Variant specs — only insert if none exist yet
            if (v.specs.length > 0) {
                const specCount = await db.spec.count({ where: { variantId: variant.id } });
                if (specCount === 0) {
                    await db.spec.createMany({
                        data: v.specs.map((sp) => ({ name: sp.name, value: sp.value, variantId: variant.id })),
                    });
                }
            }

            seededVariants += 1;
        }

        // Reviews — only if product has none yet
        const existingReviews = await db.review.count({ where: { productId: product.id } });
        if (existingReviews === 0 && users.length > 0) {
            const reviewCount = 3 + Math.floor(Math.random() * 5); // 3–7
            let totalRating = 0;

            for (let ri = 0; ri < reviewCount; ri++) {
                const tpl = REVIEW_TEMPLATES[ri % REVIEW_TEMPLATES.length];
                const reviewer = users[ri % users.length];
                const firstVariant = def.variants[0];
                const firstSize = firstVariant.sizes[0];

                await db.review.create({
                    data: {
                        variant: firstVariant.variantName,
                        variantImage: `https://picsum.photos/seed/${firstVariant.imageSeeds[0]}/640/640`,
                        review: tpl.review,
                        rating: tpl.rating,
                        color: tpl.color,
                        size: firstSize.size,
                        quantity: tpl.quantity,
                        isVerifiedPurchase: ri < 2,
                        userId: reviewer.id,
                        productId: product.id,
                        createdAt: daysAgo(180 - ri * 20),
                    },
                });

                totalRating += tpl.rating;
                seededReviews += 1;
            }

            await db.product.update({
                where: { id: product.id },
                data: {
                    rating: Math.round((totalRating / reviewCount) * 10) / 10,
                    numReviews: reviewCount,
                },
            });
        }

        process.stdout.write(`  [OK] ${def.name}\n`);
    }

    console.log(`\nDone:`);
    console.log(`  ${seededProducts} products`);
    console.log(`  ${seededVariants} variants`);
    console.log(`  ${seededReviews} reviews`);
}

main()
    .catch((err) => {
        console.error("Seed failed:", err);
        process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
