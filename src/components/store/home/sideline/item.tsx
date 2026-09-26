'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { FC } from 'react';
import { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidelineItemProps {
	link: string;
	label: string;
	icon: LucideIcon;
	badge?: string | number;
	badgeColor?: string;
	className?: string;
	iconClassName?: string;
}

const SidelineItem: FC<SidelineItemProps> = ({
	link,
	label,
	icon: Icon,
	badge,
	badgeColor = 'bg-primary text-primary-foreground',
	className,
	iconClassName,
}) => {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Link
					href={link}
					aria-label={label}
					className={cn(
						'relative flex items-center justify-center size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-all duration-200 active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
						className,
					)}
				>
					<Icon className={cn('size-4.5 transition-transform duration-200 group-hover:scale-110', iconClassName)} />
					{badge !== undefined && (
						<span
							className={cn(
								'absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold leading-none shadow-sm',
								badgeColor,
							)}
						>
							{badge}
						</span>
					)}
				</Link>
			</TooltipTrigger>
			<TooltipContent side='left' sideOffset={10} className='font-medium text-xs'>
				{label}
			</TooltipContent>
		</Tooltip>
	);
};

export default SidelineItem;
