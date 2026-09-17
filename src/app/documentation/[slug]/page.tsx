import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
	getDocArticleBySlug,
	getAdjacentDocArticles,
	getAllDocSlugs,
} from '@/lib/docs/docs-data';
import { DocsToc } from '@/components/docs/docs-toc';
import { DocsCallout } from '@/components/docs/docs-callout';
import { DocsTable } from '@/components/docs/docs-table';
import { DocsImage } from '@/components/docs/docs-image';
import { ChevronLeft, ChevronRight, Clock, Calendar, Check, Copy } from 'lucide-react';

export async function generateStaticParams() {
	return getAllDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const article = getDocArticleBySlug(slug);

	if (!article) {
		return {
			title: 'Documentation Not Found',
			description: 'The requested documentation page could not be found.',
		};
	}

	const baseUrl =
		process.env.NEXT_PUBLIC_APP_URL ||
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
	const canonicalUrl = `${baseUrl}/documentation/${article.slug}`;

	return {
		title: article.title,
		description: article.description,
		alternates: {
			canonical: canonicalUrl,
		},
		openGraph: {
			title: `${article.title} · GoCart Docs`,
			description: article.description,
			url: canonicalUrl,
			type: 'article',
			images: [{ url: '/og-image.png', alt: article.title }],
		},
		twitter: {
			card: 'summary_large_image',
			title: `${article.title} · GoCart Docs`,
			description: article.description,
			images: ['/og-image.png'],
		},
	};
}

function renderFormattedText(text: string): React.ReactNode {
	const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g);
	return parts.map((part, index) => {
		if (part.startsWith('**') && part.endsWith('**')) {
			return (
				<strong key={index} className='font-bold text-foreground'>
					{part.slice(2, -2)}
				</strong>
			);
		}
		if (part.startsWith('`') && part.endsWith('`')) {
			return (
				<code
					key={index}
					className='px-1.5 py-0.5 mx-0.5 rounded bg-muted/90 font-mono text-xs text-emerald-600 dark:text-emerald-400 border border-border/60 break-words inline-block max-w-full align-middle'
				>
					{part.slice(1, -1)}
				</code>
			);
		}
		const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
		if (linkMatch) {
			const [, label, url] = linkMatch;
			const isExternal = url.startsWith('http');
			if (isExternal) {
				return (
					<a
						key={index}
						href={url}
						target='_blank'
						rel='noopener noreferrer'
						className='font-medium text-emerald-600 dark:text-emerald-400 hover:underline'
					>
						{label}
					</a>
				);
			}
			return (
				<Link
					key={index}
					href={url}
					className='font-medium text-emerald-600 dark:text-emerald-400 hover:underline'
				>
					{label}
				</Link>
			);
		}
		return part;
	});
}

function renderDocParagraph(paragraph: string, pIdx: number): React.ReactNode {
	if (paragraph.startsWith('### ')) {
		return (
			<h3 key={pIdx} className='text-base sm:text-lg font-bold text-foreground mt-6 mb-3'>
				{renderFormattedText(paragraph.slice(4))}
			</h3>
		);
	}
	if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
		return (
			<div key={pIdx} className='flex items-start gap-2.5 text-sm sm:text-base leading-relaxed text-muted-foreground my-1.5 pl-1'>
				<span className='w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2 sm:mt-2.5' />
				<span className='flex-1 break-words'>{renderFormattedText(paragraph.slice(2))}</span>
			</div>
		);
	}
	return (
		<p key={pIdx} className='whitespace-pre-line leading-relaxed break-words'>
			{renderFormattedText(paragraph)}
		</p>
	);
}

export default async function DocumentationArticlePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const article = getDocArticleBySlug(slug);

	if (!article) {
		return notFound();
	}

	const { prev, next } = getAdjacentDocArticles(slug);
	const baseUrl =
		process.env.NEXT_PUBLIC_APP_URL ||
		(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
	const articleUrl = `${baseUrl}/documentation/${article.slug}`;

	const jsonLd = [
		{
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Home',
					item: baseUrl,
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'Documentation',
					item: `${baseUrl}/documentation`,
				},
				{
					'@type': 'ListItem',
					position: 3,
					name: article.category,
				},
				{
					'@type': 'ListItem',
					position: 4,
					name: article.title,
					item: articleUrl,
				},
			],
		},
		{
			'@context': 'https://schema.org',
			'@type': 'TechArticle',
			headline: article.title,
			description: article.description,
			url: articleUrl,
			inLanguage: 'en-US',
			publisher: {
				'@type': 'Organization',
				name: 'GoCart',
				logo: `${baseUrl}/goCart.svg`,
			},
		},
	];

	return (
		<div className='flex-1 flex justify-between gap-8 px-4 sm:px-8 lg:px-12 py-6 sm:py-8 max-w-full overflow-x-hidden'>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>

			{/* Main Article Prose Content */}
			<main className='flex-1 max-w-4xl min-w-0'>
				{/* Breadcrumbs & Metadata Bar */}
				<div className='flex flex-wrap items-center justify-between gap-2 mb-6 text-xs text-muted-foreground'>
					<div className='flex items-center gap-1.5 font-medium'>
						<Link href='/documentation' className='hover:text-foreground transition-colors'>
							Docs
						</Link>
						<span>›</span>
						<span className='text-emerald-600 dark:text-emerald-400 font-semibold'>
							{article.category}
						</span>
						<span>›</span>
						<span className='text-foreground truncate max-w-[180px] sm:max-w-none'>
							{article.title}
						</span>
					</div>

					<div className='flex items-center gap-3 text-[11px] opacity-80'>
						<span className='flex items-center gap-1'>
							<Clock className='w-3 h-3' />
							{article.readTime}
						</span>
						<span className='flex items-center gap-1'>
							<Calendar className='w-3 h-3' />
							{article.lastUpdated}
						</span>
					</div>
				</div>

				{/* Title & Lead Paragraph */}
				<header className='mb-8 border-b border-border/80 pb-6'>
					<h1 className='text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4 leading-tight break-words'>
						{article.title}
					</h1>
					<p className='text-base sm:text-lg text-muted-foreground leading-relaxed'>
						{renderFormattedText(article.intro)}
					</p>
				</header>

				{/* Optional Top Callout */}
				{article.topCallout && <DocsCallout callout={article.topCallout} />}

				{/* Article Body Sections */}
				<div className='space-y-10'>
					{article.sections.map((section) => (
						<section key={section.id} id={section.id} className='scroll-mt-24'>
							<h2 className='text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground mb-4 border-b border-border/40 pb-2 break-words'>
								{section.title}
							</h2>

							<div className='space-y-3 sm:space-y-4 text-sm sm:text-base leading-relaxed text-muted-foreground'>
								{section.content.map((paragraph, pIdx) => renderDocParagraph(paragraph, pIdx))}
							</div>

							{/* Callout */}
							{section.callout && <DocsCallout callout={section.callout} />}

							{/* Responsive Table */}
							{section.table && <DocsTable table={section.table} />}

							{/* Code Snippet */}
							{section.codeBlock && (
								<div className='my-6 rounded-xl overflow-hidden border border-border/80 bg-zinc-950 text-zinc-100 shadow-md'>
									{section.codeBlock.filename && (
										<div className='px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-mono text-zinc-400 flex items-center justify-between'>
											<span>{section.codeBlock.filename}</span>
											<span className='text-[10px] uppercase tracking-wider text-emerald-400'>
												{section.codeBlock.language}
											</span>
										</div>
									)}
									<pre className='p-4 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed'>
										<code>{section.codeBlock.code}</code>
									</pre>
								</div>
							)}

							{/* Screenshot / Figure */}
							{section.image && <DocsImage image={section.image} />}

							{/* Subsections */}
							{section.subsections?.map((sub) => (
								<div key={sub.id} id={sub.id} className='mt-6 pl-4 border-l-2 border-border/60 scroll-mt-24'>
									<h3 className='text-base sm:text-lg font-semibold text-foreground mb-2'>
										{sub.title}
									</h3>
									<div className='space-y-3 text-sm text-muted-foreground'>
										{sub.content.map((subP, subIdx) => renderDocParagraph(subP, subIdx))}
									</div>
									{sub.codeBlock && (
										<div className='my-4 rounded-xl overflow-hidden border border-border/80 bg-zinc-950 text-zinc-100'>
											<pre className='p-4 text-xs font-mono overflow-x-auto'>
												<code>{sub.codeBlock.code}</code>
											</pre>
										</div>
									)}
								</div>
							))}
						</section>
					))}
				</div>

				{/* Bottom Pagination Links */}
				<footer className='mt-16 pt-8 border-t border-border/80'>
					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						{prev ? (
							<Link
								href={`/documentation/${prev.slug}`}
								className='flex items-center gap-3 p-4 rounded-xl border border-border hover:border-emerald-500/50 bg-card hover:bg-muted/40 transition-all group text-left'
							>
								<div className='p-2 rounded-lg bg-muted group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors'>
									<ChevronLeft className='w-4 h-4' />
								</div>
								<div>
									<div className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
										Previous Page
									</div>
									<div className='text-sm font-bold text-foreground group-hover:text-emerald-500 transition-colors'>
										{prev.title}
									</div>
								</div>
							</Link>
						) : (
							<div />
						)}

						{next ? (
							<Link
								href={`/documentation/${next.slug}`}
								className='flex items-center justify-end gap-3 p-4 rounded-xl border border-border hover:border-emerald-500/50 bg-card hover:bg-muted/40 transition-all group text-right'
							>
								<div>
									<div className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
										Next Page
									</div>
									<div className='text-sm font-bold text-foreground group-hover:text-emerald-500 transition-colors'>
										{next.title}
									</div>
								</div>
								<div className='p-2 rounded-lg bg-muted group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors'>
									<ChevronRight className='w-4 h-4' />
								</div>
							</Link>
						) : (
							<div />
						)}
					</div>
				</footer>
			</main>

			{/* Sticky On-Page Table of Contents */}
			<DocsToc headings={article.headings} />
		</div>
	);
}
