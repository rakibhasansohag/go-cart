'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE_OPTIONS = [
	{ label: '12 per page', value: '12' },
	{ label: '24 per page', value: '24' },
	{ label: '36 per page', value: '36' },
	{ label: '48 per page', value: '48' },
];

export default function PageSizeSelector() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const { replace } = useRouter();

	const currentLimit = searchParams.get('limit') || '24';

	const handleLimitChange = (newLimit: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (newLimit === '24') {
			params.delete('limit');
		} else {
			params.set('limit', newLimit);
		}
		// Reset page back to 1 on page size alteration
		params.delete('page');
		const queryString = params.toString();
		replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
	};

	return (
		<div className='flex items-center gap-1.5'>
			<Select value={currentLimit} onValueChange={handleLimitChange}>
				<SelectTrigger
					className='w-[130px] sm:w-[145px] h-9 bg-background border-border text-xs font-semibold cursor-pointer shadow-none'
					aria-label='Select products per page'
				>
					<div className='flex items-center gap-1 truncate'>
						<span className='text-muted-foreground font-normal text-[11px] hidden sm:inline'>Show:</span>
						<SelectValue placeholder='24 per page' />
					</div>
				</SelectTrigger>
				<SelectContent className='bg-background border-border shadow-lg'>
					{PAGE_SIZE_OPTIONS.map((opt) => (
						<SelectItem
							key={opt.value}
							value={opt.value}
							className='text-xs font-medium cursor-pointer hover:bg-secondary focus:bg-secondary'
						>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
