'use client';

import React, { useEffect, useState } from 'react';
import { DocHeading } from '@/lib/docs/docs-data';
import { AlignLeft } from 'lucide-react';

interface DocsTocProps {
	headings: DocHeading[];
}

export function DocsToc({ headings }: DocsTocProps) {
	const [activeId, setActiveId] = useState<string>(headings[0]?.id || '');

	useEffect(() => {
		if (headings.length === 0) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setActiveId(entry.target.id);
					}
				}
			},
			{
				rootMargin: '-80px 0% -60% 0%',
				threshold: 0.1,
			},
		);

		for (const heading of headings) {
			const el = document.getElementById(heading.id);
			if (el) observer.observe(el);
		}

		return () => observer.disconnect();
	}, [headings]);

	if (headings.length === 0) return null;

	const scrollToHeading = (id: string) => {
		const el = document.getElementById(id);
		if (el) {
			const top = el.getBoundingClientRect().top + window.scrollY - 90;
			window.scrollTo({ top, behavior: 'smooth' });
			setActiveId(id);
		}
	};

	return (
		<aside className='hidden xl:block w-64 shrink-0'>
			<div className='sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2'>
				<div className='flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-foreground/80'>
					<AlignLeft className='w-3.5 h-3.5 text-emerald-500' />
					<span>On this page</span>
				</div>
				<nav aria-label='Table of contents'>
					<ul className='space-y-1 text-sm border-l border-border/80'>
						{headings.map((heading) => {
							const isActive = activeId === heading.id;
							return (
								<li key={heading.id}>
									<button
										type='button'
										onClick={() => scrollToHeading(heading.id)}
										className={`block text-left w-full transition-colors duration-150 py-1.5 pl-3.5 -ml-px border-l-2 text-xs leading-snug ${
											isActive
												? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold'
												: 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
										} ${heading.level === 3 ? 'pl-6 text-[11px]' : ''}`}
									>
										{heading.title}
									</button>
								</li>
							);
						})}
					</ul>
				</nav>
			</div>
		</aside>
	);
}
