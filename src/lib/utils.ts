/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { db } from './db';
import ColorThief from 'colorthief';
import { Country } from './types';
import countries from '@/data/countries.json';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Point :  Helper function to generate a unique slug
export const generateUniqueSlug = async (
	baseSlug: string,
	model: keyof PrismaClient,
	field: string = 'slug',
	separator: string = '-',
) => {
	let slug = baseSlug;
	let suffix = 1;

	while (true) {
		const existingRecord = await (db[model] as any).findFirst({
			where: {
				[field]: slug,
			},
		});
		if (!existingRecord) {
			break;
		}
		slug = `${slug}${separator}${suffix}`;
		suffix += 1;
	}
	return slug;
};

// Point:  Helper function to grid grid classnames dependng on length
export const getGridClassName = (length: number) => {
	switch (length) {
		case 2:
			return 'grid-cols-2';
		case 3:
			return 'grid-cols-2 grid-rows-2';
		case 4:
			return 'grid-cols-2 grid-rows-1';
		case 5:
			return 'grid-cols-2 grid-rows-6';
		case 6:
			return 'grid-cols-2';
		default:
			return '';
	}
};

// Point:  Function to get prominent colors from an image
export const getDominantColors = (imgUrl: string): Promise<string[]> => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'Anonymous';
		img.src = imgUrl;
		img.onload = () => {
			try {
				const colorThief = new ColorThief();
				const colors = colorThief.getPalette(img, 4).map((color) => {
					// Convert RGB array to hex string
					return `#${((1 << 24) + (color[0] << 16) + (color[1] << 8) + color[2])
						.toString(16)
						.slice(1)
						.toUpperCase()}`;
				});
				resolve(colors);
			} catch (error) {
				reject(error);
			}
		};
		img.onerror = () => {
			reject(new Error('Failed to load image'));
		};
	});
};

// the helper function to get the user country
// Define the default country
export const DEFAULT_COUNTRY: Country = {
	name: 'Bangladesh',
	code: 'BD',
	city: '',
	region: '',
};

interface IPInfoResponse {
	country: string;
	city: string;
	region: string;
}
export async function getUserCountry(req: Request): Promise<Country> {
	let userCountry: Country = DEFAULT_COUNTRY;

	// If geo data is available (in production on Vercel as an edge function)
	const geo = (req as any).geo; // For edge functions in Vercel
	if (geo) {
		userCountry = {
			name: geo.country || DEFAULT_COUNTRY.name,
			code: geo.country || DEFAULT_COUNTRY.code,
			city: geo.city || DEFAULT_COUNTRY.city,
			region: geo.region || DEFAULT_COUNTRY.region,
		};
	} else {
		// Fallback to IPInfo API on localhost or non-edge environments
		try {
			const response = await fetch(
				`https://ipinfo.io/?token=${process.env.NEXT_PUBLIC_IP_INFO_TOKEN}`,
			);
			if (response.ok) {
				const data = (await response.json()) as IPInfoResponse;
				userCountry = {
					name:
						countries.find((c) => c.code === data.country)?.name ||
						data.country ||
						DEFAULT_COUNTRY.name,
					code: data.country || DEFAULT_COUNTRY.code,
					city: data.city || DEFAULT_COUNTRY.city,
					region: data.region || DEFAULT_COUNTRY.region,
				};
			}
		} catch (error) {
			console.error('Error fetching user country:', error);
		}
	}

	return userCountry;
}
