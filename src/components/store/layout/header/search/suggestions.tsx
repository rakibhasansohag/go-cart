import { SearchResult } from '@/lib/types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FC } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface Props {
	suggestions: SearchResult[];
	query: string;
	selectedIndex?: number;
	isLoading?: boolean;
	hasError?: boolean;
	onSelect?: () => void;
}

const SearchSuggestions: FC<Props> = ({
	suggestions,
	query,
	selectedIndex = -1,
	isLoading = false,
	hasError = false,
	onSelect,
}) => {
	const router = useRouter();

	const highlightText = (text: string, query: string) => {
		const terms = query
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

		if (terms.length === 0) return text;

		const regex = new RegExp(`(${terms.join('|')})`, 'gi');
		const parts = text.split(regex);
		const lowerTerms = new Set(
			query
				.trim()
				.split(/\s+/)
				.filter(Boolean)
				.map((term) => term.toLowerCase()),
		);

		return parts.map((part, index) =>
			lowerTerms.has(part.toLowerCase()) ? (
				<strong key={index} className='text-orange-background font-semibold'>
					{part}
				</strong>
			) : (
				part
			),
		);
	};

	const handlePush = (link: string) => {
		if (onSelect) onSelect();
		router.push(link);
	};

	return (
		<div
			id='search-suggestions-list'
			role='listbox'
			className='absolute top-11 w-full rounded-2xl bg-card dark:bg-slate-900 text-card-foreground shadow-2xl !z-[99] overflow-hidden border border-border/40 backdrop-blur-md'
		>
			<div className='py-2 max-h-96 overflow-y-auto'>
				{hasError ? (
					<div className='px-6 py-4 text-sm text-red-500'>
						Unable to load search suggestions. Please try again.
					</div>
				) : isLoading && suggestions.length === 0 ? (
					<div className='px-6 py-4 text-sm text-main-secondary animate-pulse'>
						Searching for &ldquo;{query}&rdquo;...
					</div>
				) : suggestions.length === 0 ? (
					<div className='px-6 py-4 text-sm text-main-secondary'>
						No products found for &ldquo;{query}&rdquo;
					</div>
				) : (
					<ul>
						{suggestions.map((sugg, index) => {
							const isSelected = index === selectedIndex;
							return (
								<li
									key={`${sugg.link}-${index}`}
									id={`suggestion-item-${index}`}
									role='option'
									aria-selected={isSelected}
									className={cn(
										'group w-full h-16 px-4 cursor-pointer flex items-center gap-x-3.5 transition-all duration-200 ease-out border-b border-border/10 last:border-b-0',
										isSelected
											? 'bg-slate-100 dark:bg-slate-800/90 translate-x-1 font-medium'
											: 'hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:translate-x-1',
									)}
									onClick={() => handlePush(sugg.link)}
								>
									{sugg.image ? (
										<div className='relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted/40 ring-1 ring-border/20'>
											<Image
												src={sugg.image}
												alt=''
												width={48}
												height={48}
												className='w-12 h-12 rounded-lg object-cover transition-transform duration-200 ease-out group-hover:scale-105'
											/>
										</div>
									) : (
										<div className='w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-xs text-muted-foreground ring-1 ring-border/20'>
											No image
										</div>
									)}
									<div className='flex-1 min-w-0'>
										<span className='text-sm leading-5 block truncate text-foreground/90 group-hover:text-foreground transition-colors duration-150'>
											{highlightText(sugg.name, query)}
										</span>
									</div>
									<ChevronRight className='w-4 h-4 text-muted-foreground/40 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out shrink-0 ml-auto' />
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
};

export default SearchSuggestions;
