'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { DOCS_CATEGORIES, DOC_ARTICLES } from '@/lib/docs/docs-data';
import { Search, X, FileText, ArrowRight } from 'lucide-react';

interface DocsSearchModalProps {
	isOpen: boolean;
	onClose: () => void;
	onOpen?: () => void;
}

interface SearchResult {
	slug: string;
	title: string;
	category: string;
	description: string;
	matchedHeading?: string;
}

export function DocsSearchModal({ isOpen, onClose, onOpen }: DocsSearchModalProps) {
	const router = useRouter();
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SearchResult[]>([]);
	const [, startTransition] = useTransition();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				if (isOpen) {
					onClose();
				} else {
					setQuery('');
					onOpen?.();
				}
			}
			if (e.key === 'Escape' && isOpen) {
				onClose();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, onClose, onOpen]);

	useEffect(() => {
		if (!query.trim()) {
			// Show top recommended articles
			const initial: SearchResult[] = [];
			for (const cat of DOCS_CATEGORIES) {
				for (const art of cat.articles.slice(0, 2)) {
					initial.push({
						slug: art.slug,
						title: art.title,
						category: cat.title,
						description: art.description,
					});
				}
			}
			setResults(initial);
			return;
		}

		const cleanQuery = query.toLowerCase().trim();
		const matched: SearchResult[] = [];

		for (const [slug, article] of Object.entries(DOC_ARTICLES)) {
			let isMatch = false;
			let matchedHeading: string | undefined = undefined;

			if (
				article.title.toLowerCase().includes(cleanQuery) ||
				article.description.toLowerCase().includes(cleanQuery) ||
				article.tags.some((t) => t.toLowerCase().includes(cleanQuery))
			) {
				isMatch = true;
			}

			// Check headings
			for (const heading of article.headings) {
				if (heading.title.toLowerCase().includes(cleanQuery)) {
					isMatch = true;
					matchedHeading = heading.title;
					break;
				}
			}

			if (isMatch) {
				matched.push({
					slug,
					title: article.title,
					category: article.category,
					description: article.description,
					matchedHeading,
				});
			}
		}

		setResults(matched);
	}, [query]);

	if (!isOpen) return null;

	const handleSelect = (slug: string) => {
		onClose();
		startTransition(() => {
			router.push(`/documentation/${slug}`);
		});
	};

	return (
		<div
			className='fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-28 px-3 sm:px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200'
			onClick={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				className='w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]'
				role='dialog'
				aria-modal='true'
				onClick={(e) => e.stopPropagation()}
			>
				{/* Search Field Header */}
				<div className='relative flex items-center px-4 py-3.5 border-b border-border bg-muted/40 shrink-0'>
					<Search className='w-5 h-5 text-muted-foreground mr-3 shrink-0' />
					<input
						type='text'
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder='Search documentation (e.g. payout, checkout, variants)...'
						className='w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none'
						autoFocus
					/>
					{query && (
						<button
							type='button'
							onClick={() => setQuery('')}
							className='p-1 text-muted-foreground hover:text-foreground mr-2 rounded-md hover:bg-muted'
							title='Clear query'
						>
							<X className='w-4 h-4' />
						</button>
					)}
					<button
						type='button'
						onClick={onClose}
						className='p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted ml-1 sm:hidden shrink-0'
						aria-label='Close search modal'
						title='Close'
					>
						<X className='w-4 h-4' />
					</button>
					<kbd className='hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-muted-foreground bg-background border border-border rounded shadow-xs'>
						ESC
					</kbd>
				</div>

				{/* Results List */}
				<div className='max-h-[60vh] overflow-y-auto p-2 divide-y divide-border/40'>
					{results.length === 0 ? (
						<div className='py-12 text-center text-sm text-muted-foreground'>
							<p>No documentation found for &quot;{query}&quot;</p>
							<p className='text-xs mt-1 opacity-70'>Try searching with broader terms like &quot;order&quot; or &quot;seller&quot;</p>
						</div>
					) : (
						results.map((item) => (
							<button
								key={item.slug}
								type='button'
								onClick={() => handleSelect(item.slug)}
								className='w-full text-left p-3.5 rounded-xl hover:bg-muted/70 transition-colors flex items-start gap-3.5 group'
							>
								<div className='p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors'>
									<FileText className='w-4 h-4' />
								</div>
								<div className='flex-1 min-w-0'>
									<div className='flex items-center gap-2 mb-0.5'>
										<span className='text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
											{item.category}
										</span>
										{item.matchedHeading && (
											<span className='text-xs text-muted-foreground truncate'>
												› {item.matchedHeading}
											</span>
										)}
									</div>
									<h4 className='text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors'>
										{item.title}
									</h4>
									<p className='text-xs text-muted-foreground line-clamp-1 mt-0.5'>
										{item.description}
									</p>
								</div>
								<ArrowRight className='w-4 h-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center' />
							</button>
						))
					)}
				</div>

				{/* Footer Bar */}
				<div className='flex items-center justify-between px-4 py-2.5 bg-muted/30 border-t border-border/80 text-[11px] text-muted-foreground'>
					<span>Search GoCart Multi-Vendor Documentation</span>
					<div className='flex items-center gap-2'>
						<span>Navigate with click or enter</span>
					</div>
				</div>
			</div>
		</div>
	);
}
