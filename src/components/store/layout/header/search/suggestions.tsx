import { SearchResult } from '@/lib/types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FC } from 'react';
import { cn } from '@/lib/utils';

interface Props {
	suggestions: SearchResult[];
	query: string;
	selectedIndex?: number;
	isLoading?: boolean;
	onSelect?: () => void;
}

const SearchSuggestions: FC<Props> = ({
	suggestions,
	query,
	selectedIndex = -1,
	isLoading = false,
	onSelect,
}) => {
	const router = useRouter();

	const highlightText = (text: string, query: string) => {
		if (!query.trim()) return text;
		const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
		const parts = text.split(regex);

		return parts.map((part, index) =>
			part.toLowerCase() === query.toLowerCase() ? (
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
			className='absolute top-11 w-full rounded-2xl bg-secondary text-main-primary shadow-2xl !z-[99] overflow-hidden border border-border/20'
		>
			<div className='py-2 max-h-96 overflow-y-auto'>
				{isLoading && suggestions.length === 0 ? (
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
										'w-full h-16 px-4 cursor-pointer flex items-center gap-x-3 transition-colors duration-150',
										isSelected ? 'bg-f5 font-medium' : 'hover:bg-f5',
									)}
									onClick={() => handlePush(sugg.link)}
								>
									{sugg.image ? (
										<Image
											src={sugg.image}
											alt=''
											width={48}
											height={48}
											className='w-12 h-12 rounded-md object-cover flex-shrink-0'
										/>
									) : (
										<div className='w-12 h-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0 text-xs text-muted-foreground'>
											No image
										</div>
									)}
									<div className='flex-1 min-w-0'>
										<span className='text-sm leading-5 block truncate'>
											{highlightText(sugg.name, query)}
										</span>
									</div>
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
