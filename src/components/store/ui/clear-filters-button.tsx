import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { FC } from 'react';

interface Props {
	onClick: () => void;
	className?: string;
}

const ClearFiltersButton: FC<Props> = ({ onClick, className }) => {
	return (
		<button
			onClick={onClick}
			className={cn(
				'flex items-center gap-x-1.5 text-xs text-main-secondary hover:text-red-500 cursor-pointer select-none transition-all duration-200 font-medium py-1.5 px-3 rounded-lg hover:bg-red-500/10 active:scale-95 border border-transparent hover:border-red-500/20',
				className
			)}
		>
			<Trash2 className='w-3.5 h-3.5' />
			<span>Remove all filters</span>
		</button>
	);
};

export default ClearFiltersButton;
