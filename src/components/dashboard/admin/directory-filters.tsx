'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FilterOption = { value: string; label: string };

export function DirectoryFilters({
	initialSearch = '',
	initialStatus = 'ALL',
	placeholder,
	statusOptions,
}: {
	initialSearch?: string;
	initialStatus?: string;
	placeholder: string;
	statusOptions: FilterOption[];
}) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const [search, setSearch] = useState(initialSearch);
	const [status, setStatus] = useState(initialStatus);

	function navigate(nextSearch = search, nextStatus = status) {
		const params = new URLSearchParams(searchParams.toString());
		const normalizedSearch = nextSearch.trim();
		if (normalizedSearch) params.set('search', normalizedSearch); else params.delete('search');
		if (nextStatus !== 'ALL') params.set('status', nextStatus); else params.delete('status');
		params.delete('page');
		const query = params.toString();
		startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		navigate();
	}

	const hasFilters = Boolean(search.trim()) || status !== 'ALL';

	return <form onSubmit={submit} className='flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end'>
		<div className='relative min-w-0 flex-1 space-y-1'>
			<label className='text-xs font-medium' htmlFor='directory-search'>Search</label>
			<Search className='pointer-events-none absolute bottom-3 left-3 size-4 text-muted-foreground' />
			<Input id='directory-search' value={search} onChange={(event) => setSearch(event.target.value)} placeholder={placeholder} className='pl-9' />
		</div>
		<div className='space-y-1 sm:w-48'>
			<label className='text-xs font-medium' htmlFor='directory-status'>Status</label>
			<Select value={status} onValueChange={setStatus}>
				<SelectTrigger id='directory-status'><SelectValue /></SelectTrigger>
				<SelectContent>{statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
			</Select>
		</div>
		<div className='flex gap-2'>
			<Button type='submit' disabled={isPending}>{isPending ? 'Applying…' : 'Apply'}</Button>
			{hasFilters && <Button type='button' variant='outline' onClick={() => { setSearch(''); setStatus('ALL'); navigate('', 'ALL'); }}><X className='mr-1 size-4' />Clear</Button>}
		</div>
	</form>;
}
