'use client';
import { SearchResult } from '@/lib/types';
import { Search as SearchIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChangeEvent, useState } from 'react';
import SearchSuggestions from './suggestions';
import { Button } from '@/components/store/ui/button';

export default function Search() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const params = new URLSearchParams(searchParams);
	const { push, replace } = useRouter();

	const search_query_url = params.get('search');

	const [searchQuery, setSearchQuery] = useState<string>(
		search_query_url || '',
	);
	const [suggestions, setSuggestions] = useState<SearchResult[]>([]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchQuery(value);
		if (value) {
			const res = await fetch(`/api/search?q=${value}`);
			const data = await res.json();
			setSuggestions(data);
		} else {
			setSuggestions([]);
		}
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (searchQuery.trim()) {
			params.set('search', searchQuery);
			push(`/browse?${params.toString()}`);
			setSuggestions([]);
		}
	};

	return (
		<div className='relative lg:w-full flex-1'>
			<form
				onSubmit={handleSubmit}
				className='h-10 rounded-3xl bg-background relative border-none flex'
			>
				<input
					type='text'
					placeholder='Search...'
					className='bg-background text-main-primary flex-1 border-none pl-2.5 m-2.5 outline-none'
					value={searchQuery}
					onChange={handleInputChange}
				/>
				{suggestions.length > 0 && (
					<SearchSuggestions suggestions={suggestions} query={searchQuery} />
				)}
				<Button
					type='submit'
					variant='unstyled'
					className='border-[1px] rounded-[20px] w-[56px] h-8 mt-1 mr-1 mb-0 ml-0 bg-gradient-to-r from-slate-500 to bg-slate-600 grid place-items-center cursor-pointer'
				>
					<SearchIcon className="text-white" />
				</Button>
			</form>
		</div>
	);
}
