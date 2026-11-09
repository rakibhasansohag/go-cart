// React, Next.js
import { FC } from 'react';
import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
	className?: string;
	markClassName?: string;
	wordmarkClassName?: string;
	accentClassName?: string;
}

const Logo: FC<LogoProps> = ({ className, markClassName, wordmarkClassName, accentClassName }) => {
	return (
		<span className={cn('inline-flex items-center gap-2.5', className)}>
			<Image
				src='/goCart.svg'
				alt=''
				width={40}
				height={40}
				priority
				className={cn('size-10 shrink-0 drop-shadow-sm', markClassName)}
			/>
			<span
				className={cn(
					'font-barlow text-3xl font-extrabold leading-none tracking-tight',
					wordmarkClassName,
				)}
			>
				Go<span className={cn('text-emerald-500', accentClassName)}>Cart</span>
			</span>
		</span>
	);
};

export default Logo;
