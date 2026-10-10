interface DiscountSource {
	discount: number;
	automaticDiscount?: number;
	automaticDiscountEndsAt?: Date | string | null;
}

export function effectiveDiscount(size: DiscountSource, now = Date.now()): number {
	const deadline = size.automaticDiscountEndsAt
		? new Date(size.automaticDiscountEndsAt).getTime() : 0;
	const automatic = deadline > now ? size.automaticDiscount ?? 0 : 0;
	return Math.min(100, Math.max(0, size.discount, automatic));
}

export function effectivePrice(size: DiscountSource & { price: number }, now = Date.now()): number {
	return Math.round(size.price * (1 - effectiveDiscount(size, now) / 100) * 100) / 100;
}

export function storefrontSizes<T extends DiscountSource>(sizes: T[]): T[] {
	const now = Date.now();
	return sizes.map(size => ({ ...size, discount: effectiveDiscount(size, now) }));
}

export function storefrontVariant<T extends { sizes: DiscountSource[]; isSale?: boolean; saleEndDate?: string | null }>(variant: T): T {
	const active = variant.sizes.filter(size => size.automaticDiscountEndsAt &&
		new Date(size.automaticDiscountEndsAt).getTime() > Date.now() &&
		(size.automaticDiscount ?? 0) > size.discount);
	const deadline = active.map(size => new Date(size.automaticDiscountEndsAt!).getTime()).sort((a, b) => a - b)[0];
	return { ...variant, sizes: storefrontSizes(variant.sizes),
		isSale: active.length > 0 || variant.isSale,
		saleEndDate: deadline ? new Date(deadline).toISOString() : variant.saleEndDate };
}
