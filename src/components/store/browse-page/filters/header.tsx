'use client';

import { FiltersQueryType } from '@/lib/types';
import { X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function FiltersHeader({
	queries: _initialQueries,
}: {
	queries?: FiltersQueryType;
}) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();

	// Dynamically derive chips from live URL search params
	const chips: { key: string; value: string; label: string }[] = [];

	searchParams.forEach((val, key) => {
		if (
			!val ||
			key === 'sort' ||
			key === 'page' ||
			key === 'limit' ||
			(key === 'search' && val === '')
		)
			return;

		if (key === 'brand' || key === 'color' || key === 'size') {
			const items = val.split(',').map((s) => s.trim()).filter(Boolean);
			items.forEach((item) => {
				if (!chips.some((c) => c.key === key && c.value === item)) {
					chips.push({ key, value: item, label: item });
				}
			});
		} else if (key === 'rating') {
			chips.push({
				key,
				value: val,
				label: `★ ${val} & above`,
			});
		} else if (key === 'minPrice') {
			chips.push({
				key,
				value: val,
				label: `Min: $${val}`,
			});
		} else if (key === 'maxPrice') {
			chips.push({
				key,
				value: val,
				label: `Max: $${val}`,
			});
		} else {
			if (!chips.some((c) => c.key === key && c.value === val)) {
				chips.push({ key, value: val, label: val });
			}
		}
	});

	const handleClearQueries = () => {
		const params = new URLSearchParams();
		const sort = searchParams.get('sort');
		if (sort) {
			params.set('sort', sort);
		}
		const limit = searchParams.get('limit');
		if (limit) {
			params.set('limit', limit);
		}
		const queryString = params.toString();
		replace(queryString ? `${pathname}?${queryString}` : pathname);
	};

	const handleRemoveChip = (chipKey: string, chipValue: string) => {
		const params = new URLSearchParams(searchParams.toString());

		if (chipKey === 'brand' || chipKey === 'color' || chipKey === 'size') {
			const existing = (params.get(chipKey) || '')
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			const updated = existing.filter((item) => item !== chipValue);
			if (updated.length > 0) {
				params.set(chipKey, updated.join(','));
			} else {
				params.delete(chipKey);
			}
		} else {
			params.delete(chipKey);
		}

		const queryString = params.toString();
		replace(queryString ? `${pathname}?${queryString}` : pathname);
	};

	return (
		<div className='pt-2.5 pb-5'>
			<div className='flex items-center justify-between h-4 leading-5'>
				<div className='text-sm font-bold'>Filter ({chips.length})</div>
				{chips.length > 0 && (
					<button
						type='button'
						className='text-xs text-orange-background hover:underline cursor-pointer'
						onClick={handleClearQueries}
					>
						Clear All
					</button>
				)}
			</div>

			{chips.length > 0 && (
				<div className='mt-3 flex flex-wrap gap-2'>
					{chips.map((chip, idx) => (
						<span
							key={`${chip.key}-${chip.value}-${idx}`}
							className='inline-flex items-center gap-1.5 border border-border bg-muted/40 py-0.5 px-2 rounded-full text-xs text-foreground select-none'
						>
							<span className='max-w-[120px] truncate'>{chip.label}</span>
							<button
								type='button'
								onClick={() => handleRemoveChip(chip.key, chip.value)}
								className='text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-0.5'
								aria-label={`Remove filter ${chip.label}`}
							>
								<X className='w-3 h-3' />
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}
