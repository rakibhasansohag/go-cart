'use client';
import { FC, useState, useEffect } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

const PriceFilter: FC = () => {
	const searchParams = useSearchParams();
	const { replace } = useRouter();
	const pathname = usePathname();

	const [draft, setDraft] = useState<{ min: string; max: string } | null>(null);
	const minPrice = draft?.min ?? searchParams.get('minPrice') ?? '';
	const maxPrice = draft?.max ?? searchParams.get('maxPrice') ?? '';

	// Handle minPrice change
	const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDraft({ min: e.target.value, max: String(maxPrice) });
	};

	// Handle maxPrice change
	const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setDraft({ min: String(minPrice), max: e.target.value });
	};

	// Use effect to handle debounce of the URL update
	useEffect(() => {
		if (!draft) return;
		const timeout = setTimeout(() => {
			const params = new URLSearchParams(searchParams.toString());
			params.delete('page');
			if (draft.min) params.set('minPrice', draft.min);
			else params.delete('minPrice');
			if (draft.max) params.set('maxPrice', draft.max);
			else params.delete('maxPrice');
			replace(`${pathname}?${params.toString()}`);
			setDraft(null);
		}, 500);
		return () => clearTimeout(timeout);
	}, [draft, searchParams, pathname, replace]);

	return (
		<div className='pt-5 pb-4'>
			<div className='relative cursor-pointer flex items-center justify-between select-none'>
				<h3 className='text-sm font-bold overflow-ellipsis capitalize line-clamp-1 text-main-primary'>
					Price
				</h3>
			</div>
			<div className='grid grid-cols-2 gap-x-2 mt-2.5'>
				<input
					name='minPrice'
					type='number'
					value={minPrice}
					onChange={handleMinPriceChange}
					placeholder='Min Price'
					className='h-[32px] w-20 text-main-primary bg-background border rounded-md text-xs pl-1'
				/>
				<input
					name='maxPrice'
					type='number'
					value={maxPrice}
					onChange={handleMaxPriceChange}
					placeholder='Max Price'
					className='h-[32px] w-20 text-main-primary bg-background border rounded-md text-xs pl-1'
				/>
			</div>
		</div>
	);
};

export default PriceFilter;
