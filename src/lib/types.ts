import {
	FreeShipping,
	FreeShippingCountry,
	Prisma,
	ProductVariantImage,
	ShippingFeeMethod,
	ShippingRate,
	Size,
	Spec,
} from '@prisma/client';
import { getAllSubCategories } from '../queries/subCategory';
import {
	getAllStoreProducts,
	getProducts,
	getRatingStatistics,
	getShippingDetails,
	retrieveProductDetails,
} from '@/queries/product';
import { getStoreDefaultShippingDetails } from '@/queries/store';
import { retrieveProductDetailsOptimized } from '@/queries/product-optimized';

import countries from '@/data/countries.json';

export interface DashboardSidebarMenuInterface {
	label: string;
	icon: string;
	link: string;
}

// SubCategory + parent category
export type SubCategoryWithCategoryType = Prisma.PromiseReturnType<
	typeof getAllSubCategories
>[0];

// Product + variant
export type ProductWithVariantType = {
	productId: string;
	variantId: string;
	name: string;
	description: string;
	variantName: string;
	variantDescription: string;
	images: { id?: string; url: string }[];
	variantImage: string;
	categoryId: string;
	offerTagId?: string;
	subCategoryId: string;
	isSale: boolean;
	saleEndDate?: string;
	brand: string;
	sku: string;
	weight: number;
	colors: { id?: string; color: string }[];
	sizes: {
		id?: string;
		size: string;
		quantity: number;
		price: number;
		discount: number;
	}[];
	product_specs: { id?: string; name: string; value: string }[];
	variant_specs: { id?: string; name: string; value: string }[];
	keywords: string[];
	questions: { id?: string; question: string; answer: string }[];
	freeShippingForAllCountries: boolean;
	freeShippingCountriesIds: { id?: string; label: string; value: string }[];
	shippingFeeMethod: ShippingFeeMethod;
	createdAt: Date;
	updatedAt: Date;
};

// Store product
export type StoreProductType = Prisma.PromiseReturnType<
	typeof getAllStoreProducts
>[0];

// Store default shipping details
export type StoreDefaultShippingType = Prisma.PromiseReturnType<
	typeof getStoreDefaultShippingDetails
>;

export type CountryWithShippingRatesType = {
	countryId: string;
	countryName: string;
	shippingRate: ShippingRate;
};

export interface Country {
	name: string;
	code: string;
	city: string;
	region: string;
}

export type SelectMenuOption = (typeof countries)[number];

export interface SearchResult {
	name: string;
	link: string;
	image: string;
}

export type CartProductType = {
	productId: string;
	variantId: string;
	productSlug: string;
	variantSlug: string;
	name: string;
	variantName: string;
	image: string;
	variantImage: string;
	sizeId: string;
	size: string;
	quantity: number;
	price: number;
	stock: number;
	weight: number;
	shippingMethod: string;
	shippingService: string;
	shippingFee: number;
	extraShippingFee: number;
	deliveryTimeMin: number;
	deliveryTimeMax: number;
	isFreeShipping: boolean;
};

// Define a local SortOrder type
export type SortOrder = 'asc' | 'desc';

export type VariantSimplified = {
	variantId: string;
	variantSlug: string;
	variantName: string;
	images: ProductVariantImage[];
	sizes: Size[];
};

export type VariantImageType = {
	url: string;
	image: string;
};

export type ProductType = Prisma.PromiseReturnType<
	typeof getProducts
>['products'][0];

export type ProductDataType = Prisma.PromiseReturnType<
	typeof retrieveProductDetailsOptimized
>;
export type ProductVariantDataType = {
	id: string;
	variantName: string;
	slug: string;
	sku: string;
	variantImage: string;
	weight: number;
	isSale: boolean;
	saleEndDate: string | null;
	variantDescription: string | null;
	images: {
		url: string;
	}[];
	sizes: Size[];
	specs: Spec[];
	colors: { name: string }[];
	keywords: string;
};

export type ShippingDetailsType = {
	countryCode: string;
	countryName: string;
	city: string;
	shippingFeeMethod: string;
	shippingFee: number;
	extraShippingFee: number;
	deliveryTimeMin: number;
	deliveryTimeMax: number;
	isFreeShipping: boolean;
	shippingService: string;
	returnPolicy: string;
};

export type FreeShippingWithCountriesType = FreeShipping & {
	eligibaleCountries: FreeShippingCountry[];
};

export type ProductPageType = Prisma.PromiseReturnType<
	typeof retrieveProductDetails
>;

export type ProductShippingDetailsType = Prisma.PromiseReturnType<
	typeof getShippingDetails
>;

export type RatingStatisticsType = Prisma.PromiseReturnType<
	typeof getRatingStatistics
>;