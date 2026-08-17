'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

type Props = {
	label: string;
	page: number;
	totalPages: number;
	total: number;
	param: string;
};

export function UrlPagination({ label, page, totalPages, total, param }: Props) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	if (totalPages <= 1) return null;
	const visiblePages: Array<number | 'ellipsis'> = totalPages <= 7
		? Array.from({ length: totalPages }, (_, index) => index + 1)
		: [1, ...(page > 3 ? ['ellipsis' as const] : []), ...Array.from(new Set([page - 1, page, page + 1].filter((value) => value > 1 && value < totalPages))).sort((a, b) => a - b), ...(page < totalPages - 2 ? ['ellipsis' as const] : []), totalPages];

	function goTo(nextPage: number) {
		const params = new URLSearchParams(searchParams.toString());
		params.set(param, String(nextPage));
		startTransition(() => router.push(`${pathname}?${params.toString()}`));
	}

	return <nav aria-label={label} className='flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-3 py-3 text-sm'>
		<p className='text-muted-foreground'>Page {page} of {totalPages} · {total} total</p>
		<div className='flex items-center gap-1'>
			<button type='button' disabled={isPending || page === 1} onClick={() => goTo(page - 1)} className='inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'>
				<ChevronLeft className='size-3.5' /> Previous
			</button>
			<div className='hidden items-center gap-1 sm:flex'>
				{visiblePages.map((value, index) => value === 'ellipsis'
					? <span key={`ellipsis-${index}`} className='inline-flex size-7 items-center justify-center text-muted-foreground' aria-hidden='true'><MoreHorizontal className='size-4' /></span>
					: <button key={value} type='button' aria-current={value === page ? 'page' : undefined} disabled={isPending || value === page} onClick={() => goTo(value)} className={`size-7 rounded-md text-xs font-medium transition-colors hover:bg-muted disabled:cursor-default ${value === page ? 'bg-primary text-primary-foreground hover:bg-primary' : ''}`}>{value}</button>)}
			</div>
			<button type='button' disabled={isPending || page === totalPages} onClick={() => goTo(page + 1)} className='inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'>
				Next <ChevronRight className='size-3.5' />
			</button>
		</div>
	</nav>;
}
