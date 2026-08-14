'use client';

import { SearchResult } from '@/lib/types';
import { Search as SearchIcon } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChangeEvent, useState, useEffect, useRef, KeyboardEvent } from 'react';
import SearchSuggestions from './suggestions';
import { Button } from '@/components/store/ui/button';

export default function Search() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const params = new URLSearchParams(searchParams);
	const { push } = useRouter();

	const search_query_url = params.get('search');

	const [searchQuery, setSearchQuery] = useState<string>(
		search_query_url || '',
	);
	const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [selectedIndex, setSelectedIndex] = useState<number>(-1);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [hasError, setHasError] = useState<boolean>(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	// Close suggestions dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Debounced search API request with AbortController
	useEffect(() => {
		const query = searchQuery.trim();
		if (!query) {
			setSuggestions([]);
			setIsOpen(false);
			setSelectedIndex(-1);
			setIsLoading(false);
			setHasError(false);
			return;
		}

		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		const controller = new AbortController();
		abortControllerRef.current = controller;

		setIsLoading(true);
		setHasError(false);
		setIsOpen(true);
		const delayDebounceFn = setTimeout(async () => {
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
					signal: controller.signal,
				});
				if (!res.ok) throw new Error('Search request failed');
				const data: SearchResult[] = await res.json();
				if (abortControllerRef.current !== controller) return;
				setSuggestions(data);
				setIsOpen(true);
				setSelectedIndex(-1);
			} catch (error: unknown) {
				if ((error as Error)?.name !== 'AbortError' && abortControllerRef.current === controller) {
					console.error('Search autocomplete error:', error);
					setSuggestions([]);
					setHasError(true);
					setIsOpen(true);
				}
			} finally {
				if (abortControllerRef.current === controller) setIsLoading(false);
			}
		}, 300);

		return () => {
			clearTimeout(delayDebounceFn);
			controller.abort();
		};
	}, [searchQuery]);

	const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (selectedIndex >= 0 && suggestions[selectedIndex]) {
			push(suggestions[selectedIndex].link);
			setIsOpen(false);
			return;
		}
		if (searchQuery.trim()) {
			params.set('search', searchQuery.trim());
			push(`/browse?${params.toString()}`);
			setIsOpen(false);
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (!isOpen) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setSelectedIndex((prev) =>
				prev < suggestions.length - 1 ? prev + 1 : 0,
			);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setSelectedIndex((prev) =>
				prev > 0 ? prev - 1 : suggestions.length - 1,
			);
		} else if (e.key === 'Escape') {
			setIsOpen(false);
			setSelectedIndex(-1);
		}
	};

	return (
		<div ref={containerRef} className='relative lg:w-full flex-1'>
			<form
				onSubmit={handleSubmit}
				className='h-10 rounded-3xl bg-background relative border-none flex'
				role='search'
			>
				<input
					type='text'
					placeholder='Search products...'
					className='bg-background text-main-primary flex-1 border-none pl-2.5 m-2.5 outline-none'
					value={searchQuery}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					onFocus={() => {
						if (searchQuery.trim()) setIsOpen(true);
					}}
					aria-busy={isLoading}
					role='combobox'
					aria-expanded={isOpen}
					aria-autocomplete='list'
					aria-controls='search-suggestions-list'
					aria-activedescendant={
						selectedIndex >= 0 ? `suggestion-item-${selectedIndex}` : undefined
					}
				/>
				{isOpen && (
					<SearchSuggestions
						suggestions={suggestions}
						query={searchQuery}
						selectedIndex={selectedIndex}
						isLoading={isLoading}
						hasError={hasError}
						onSelect={() => setIsOpen(false)}
					/>
				)}
				<Button
					type='submit'
					variant='unstyled'
					className='border-[1px] rounded-[20px] w-[56px] h-8 mt-1 mr-1 mb-0 ml-0 bg-gradient-to-r from-slate-500 to bg-slate-600 grid place-items-center cursor-pointer'
					aria-label='Submit search'
				>
					<SearchIcon className='text-white' />
				</Button>
			</form>
		</div>
	);
}
