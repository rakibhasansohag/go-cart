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
			<div className='max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4'>
				{/* Brand & Back Button */}
				<div className='flex items-center gap-3 sm:gap-6 min-w-0'>
					<button
						type='button'
						onClick={onToggleMobileSidebar}
						className='p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden'
						aria-label='Toggle documentation navigation'
					>
						<Menu className='w-5 h-5' />
					</button>

					<Link href='/documentation/introduction' className='flex items-center gap-2.5 shrink-0'>
						<Image
							src='/goCart.svg'
							alt='GoCart Logo'
							width={28}
							height={28}
							className='w-7 h-7'
						/>
						<div className='flex items-center gap-2'>
							<span className='font-bold text-base tracking-tight text-foreground'>
								GoCart <span className='text-emerald-500 font-semibold text-xs ml-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10'>Docs</span>
							</span>
						</div>
					</Link>

					<div className='h-4 w-px bg-border/80 hidden sm:block' />

					<Link
						href='/'
						className='hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group'
					>
						<ArrowLeft className='w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform' />
						<span>Back to Store</span>
					</Link>
				</div>

				{/* Search Field & Actions */}
				<div className='flex items-center gap-3'>
					{/* Search Button */}
					<button
						type='button'
						onClick={onOpenSearch}
						className='flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground bg-muted/60 hover:bg-muted border border-border/80 rounded-xl transition-all duration-150 w-36 sm:w-64 md:w-80 justify-between'
					>
						<div className='flex items-center gap-2 truncate'>
							<Search className='w-3.5 h-3.5 shrink-0 text-muted-foreground' />
							<span className='truncate'>Search docs...</span>
						</div>
						<kbd className='hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-background border border-border/80 rounded shadow-2xs'>
							Ctrl K
						</kbd>
					</button>

					{/* Version Badge */}
					<span className='hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground border border-border/60'>
						v1.0.0
					</span>

					{/* Dark / Light Mode Toggle */}
					<ThemeToggle />
				</div>
			</div>
		</header>
	);
}
