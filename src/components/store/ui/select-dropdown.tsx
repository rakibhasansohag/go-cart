import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { FC } from 'react';

interface SelectOption {
	title: string;
	value: string;
}

interface Props {
	options: SelectOption[];
	value: string;
	onChange: (value: string) => void;
	className?: string;
}

const SelectDropdown: FC<Props> = ({
	options,
	value,
	onChange,
	className,
}) => {
	return (
		<div className={cn('relative h-10 flex items-center', className || 'w-fit')}>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className='h-10 pl-4 pr-10 appearance-none outline-none cursor-pointer border border-border rounded-xl bg-secondary text-sm text-main-primary transition-all duration-200 hover:border-gray-400 focus:border-orange-background focus:ring-1 focus:ring-orange-background shadow-sm w-full'
			>
				{options.map((option) => (
					<option
						key={option.value}
						value={option.value}
						className='flex h-8 text-left text-sm overflow-hidden bg-background'
					>
						{option.title}
					</option>
				))}
			</select>
			<span className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-main-secondary'>
				<ChevronDown className='w-4 h-4' />
			</span>
		</div>
	);
};

export default SelectDropdown;
