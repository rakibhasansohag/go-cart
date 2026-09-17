'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Search, Menu } from 'lucide-react';
import ThemeToggle from '@/components/shared/theme-toggle';

interface DocsHeaderProps {
	onOpenSearch: () => void;
	onToggleMobileSidebar: () => void;
}

export function DocsHeader({ onOpenSearch, onToggleMobileSidebar }: DocsHeaderProps) {
	return (
		<header className='sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md'>
			<div className='max-w-[1600px] mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4'>
				{/* Brand & Back Button */}
				<div className='flex items-center gap-1.5 sm:gap-4 min-w-0 shrink-0'>
					<button
						type='button'
						onClick={onToggleMobileSidebar}
						className='p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden shrink-0'
						aria-label='Toggle documentation navigation'
					>
						<Menu className='w-5 h-5' />
					</button>

					<Link href='/documentation/introduction' className='flex items-center gap-2 shrink-0'>
						<Image
							src='/goCart.svg'
							alt='GoCart Logo'
							width={26}
							height={26}
							className='w-6 h-6 sm:w-7 sm:h-7'
						/>
						<div className='flex items-center gap-1.5'>
							<span className='font-bold text-sm sm:text-base tracking-tight text-foreground'>
								GoCart
							</span>
							<span className='hidden xs:inline-flex text-emerald-500 font-semibold text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-emerald-500/10'>
								Docs
							</span>
						</div>
					</Link>

					<div className='h-4 w-px bg-border/80 hidden md:block' />

					<Link
						href='/'
						className='hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group'
					>
						<ArrowLeft className='w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform' />
						<span>Back to Store</span>
					</Link>
				</div>

				{/* Search Field & Actions */}
				<div className='flex items-center gap-2 sm:gap-3 shrink-0'>
					{/* Search Button */}
					<button
						type='button'
						onClick={onOpenSearch}
						className='flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs text-muted-foreground bg-muted/60 hover:bg-muted border border-border/80 rounded-xl transition-all duration-150 h-9 w-9 sm:w-56 md:w-80 justify-center sm:justify-between shrink-0'
						title='Search documentation (Ctrl + K)'
					>
						<div className='flex items-center gap-2 truncate'>
							<Search className='w-3.5 h-3.5 shrink-0 text-muted-foreground' />
							<span className='hidden sm:inline truncate'>Search docs...</span>
						</div>
						<kbd className='hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-background border border-border/80 rounded shadow-2xs'>
							Ctrl K
						</kbd>
					</button>

					{/* Version Badge */}
					<span className='hidden lg:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border/60'>
						v1.0.0
					</span>

					{/* Dark / Light Mode Toggle */}
					<ThemeToggle />
				</div>
			</div>
		</header>
	);
}
