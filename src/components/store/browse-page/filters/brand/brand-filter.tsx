'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Check, Minus, Plus, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface BrandFacet {
	name: string;
	count: number;
}

export default function BrandFilter({
	brands,
}: {
	brands: BrandFacet[];
}) {
	const [show, setShow] = useState(true);
	const [searchFilter, setSearchFilter] = useState('');
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();

	const activeBrands = (searchParams.get('brand') || '')
		.split(',')
		.map((b) => b.trim())
		.filter(Boolean);

	const handleBrandToggle = (brandName: string) => {
		const params = new URLSearchParams(searchParams.toString());
		let updated: string[];

		if (activeBrands.includes(brandName)) {
			updated = activeBrands.filter((b) => b !== brandName);
		} else {
			updated = [...activeBrands, brandName];
		}

		if (updated.length > 0) {
			params.set('brand', updated.join(','));
		} else {
			params.delete('brand');
		}

		const queryString = params.toString();
		replace(queryString ? `${pathname}?${queryString}` : pathname);
	};

	const filteredBrands = brands.filter((brand) =>
		brand.name.toLowerCase().includes(searchFilter.toLowerCase()),
	);

	if (brands.length === 0) return null;

	return (
		<div className='pt-5 pb-4 border-b border-border'>
			<div
				className='relative cursor-pointer flex items-center justify-between select-none'
				onClick={() => setShow((prev) => !prev)}
			>
				<h3 className='text-sm font-bold capitalize text-main-primary'>
					Brand
				</h3>
				<span className='absolute right-0'>
					{show ? <Minus className='w-3 h-3' /> : <Plus className='w-3 h-3' />}
				</span>
			</div>

			<AnimatePresence initial={false}>
				{show && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: 'easeInOut' }}
						className='overflow-hidden mt-2.5 space-y-2'
					>
						{brands.length > 6 && (
							<div className='relative mb-2'>
								<Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
								<input
									type='text'
									placeholder='Search brands...'
									value={searchFilter}
									onChange={(e) => setSearchFilter(e.target.value)}
									className='w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
								/>
							</div>
						)}

						<div className='max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs'>
							{filteredBrands.map((brand) => {
								const isChecked = activeBrands.includes(brand.name);
								return (
									<div
										key={brand.name}
										role='checkbox'
										aria-checked={isChecked}
										tabIndex={0}
										onClick={() => handleBrandToggle(brand.name)}
										onKeyDown={(e) => {
											if (e.key === ' ' || e.key === 'Enter') {
												e.preventDefault();
												handleBrandToggle(brand.name);
											}
										}}
										className='flex items-center justify-between py-1 px-1.5 rounded hover:bg-muted/50 cursor-pointer select-none transition-colors'
									>
										<div className='flex items-center gap-2'>
											<div
												className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center transition-colors ${
													isChecked
														? 'bg-primary border-primary text-primary-foreground'
														: 'border-muted-foreground/40 bg-transparent'
												}`}
											>
												{isChecked && <Check className='w-2.5 h-2.5 stroke-[3]' />}
											</div>
											<span className='text-muted-foreground font-medium'>
												{brand.name}
											</span>
										</div>
										<span className='text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded'>
											{brand.count}
										</span>
									</div>
								);
							})}
							{filteredBrands.length === 0 && (
								<p className='text-xs text-muted-foreground py-1'>
									No matching brands.
								</p>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
