'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOCS_CATEGORIES } from '@/lib/docs/docs-data';
import {
	ChevronDown,
	Rocket,
	ShoppingBag,
	Store,
	ShieldCheck,
	Code,
	HelpCircle,
	X,
} from 'lucide-react';

interface DocsSidebarProps {
	isOpen?: boolean;
	onClose?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
	Rocket: <Rocket className='w-4 h-4' />,
	ShoppingBag: <ShoppingBag className='w-4 h-4' />,
	Store: <Store className='w-4 h-4' />,
	ShieldCheck: <ShieldCheck className='w-4 h-4' />,
	Code: <Code className='w-4 h-4' />,
	HelpCircle: <HelpCircle className='w-4 h-4' />,
};

export function DocsSidebar({ isOpen, onClose }: DocsSidebarProps) {
	const pathname = usePathname();
	const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

	const toggleCategory = (categoryId: string) => {
		setCollapsedCategories((prev) => ({
			...prev,
			[categoryId]: !prev[categoryId],
		}));
	};

	const sidebarContent = (
		<div className='flex flex-col h-full'>
			<div className='flex-1 overflow-y-auto px-4 py-6 space-y-6'>
				{DOCS_CATEGORIES.map((category) => {
					const isCollapsed = collapsedCategories[category.id] || false;
					return (
						<div key={category.id} className='space-y-2'>
							<button
								type='button'
								onClick={() => toggleCategory(category.id)}
								className='flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors'
							>
								<div className='flex items-center gap-2'>
									<span className='text-emerald-500'>
										{CATEGORY_ICONS[category.icon] || <Rocket className='w-4 h-4' />}
									</span>
									<span>{category.title}</span>
								</div>
								<ChevronDown
									className={`w-3.5 h-3.5 transition-transform duration-200 ${
										isCollapsed ? '-rotate-90 text-muted-foreground/60' : 'rotate-0 text-muted-foreground'
									}`}
								/>
							</button>

							{!isCollapsed && (
								<ul className='space-y-1 pl-2 border-l border-border/60 ml-2'>
									{category.articles.map((article) => {
										const href = `/documentation/${article.slug}`;
										const isActive = pathname === href;
										return (
											<li key={article.slug}>
												<Link
													href={href}
													onClick={onClose}
													className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
														isActive
															? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
															: 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
													}`}
												>
													{article.title}
												</Link>
											</li>
										);
									})}
								</ul>
							)}
						</div>
					);
				})}
			</div>

			<div className='p-4 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground'>
				<p className='font-semibold text-foreground mb-1'>Need direct assistance?</p>
				<p className='text-[11px] opacity-80'>
					Contact support or open an issue on GitHub.
				</p>
			</div>
		</div>
	);

	return (
		<>
			{/* Desktop Sticky Sidebar */}
			<aside className='hidden lg:block w-72 shrink-0 border-r border-border/80 bg-background/95 backdrop-blur-sm sticky top-16 h-[calc(100vh-4rem)] overflow-hidden'>
				{sidebarContent}
			</aside>

			{/* Mobile Drawer */}
			{isOpen && (
				<div className='fixed inset-0 z-50 lg:hidden flex'>
					<div className='fixed inset-0 bg-black/60 backdrop-blur-xs' onClick={onClose} />
					<div className='relative w-80 max-w-[85vw] h-full bg-background border-r border-border shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200'>
						<div className='flex items-center justify-between px-4 py-3.5 border-b border-border'>
							<span className='font-bold text-sm'>Documentation Menu</span>
							<button
								type='button'
								onClick={onClose}
								className='p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted'
							>
								<X className='w-4 h-4' />
							</button>
						</div>
						<div className='flex-1 overflow-hidden'>{sidebarContent}</div>
					</div>
				</div>
			)}
		</>
	);
}
