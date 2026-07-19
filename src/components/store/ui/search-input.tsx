import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { FC } from 'react';

interface Props {
	placeholder?: string;
	value: string;
	onChange: (value: string) => void;
	categoryLabel?: string;
}

const SearchInput: FC<Props> = ({
	placeholder = 'Search...',
	value,
	onChange,
	categoryLabel,
}) => {
	return (
		<div className='flex items-center border border-border bg-secondary hover:border-gray-400 focus-within:border-orange-background focus-within:ring-1 focus-within:ring-orange-background rounded-xl overflow-hidden transition-all duration-200 shadow-sm h-10 w-full max-w-[500px]'>
			{categoryLabel && (
				<div className='px-4 bg-muted text-xs font-semibold text-main-secondary border-r border-border h-full flex items-center justify-center select-none whitespace-nowrap'>
					{categoryLabel}
				</div>
			)}
			<input
				type='text'
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className='flex-1 h-full bg-transparent px-3 text-sm text-main-primary outline-none placeholder:text-neutral-500 min-w-0'
			/>
			<button
				type='button'
				className='h-full px-4 text-white bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center cursor-pointer select-none hover:opacity-90 transition-opacity outline-none'
			>
				<Search className='w-4 h-4' />
			</button>
		</div>
	);
};

export default SearchInput;
