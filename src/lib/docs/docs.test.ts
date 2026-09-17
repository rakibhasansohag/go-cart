import { describe, it, expect } from 'vitest';
import {
	DOCS_CATEGORIES,
	DOC_ARTICLES,
	getAllDocSlugs,
	getDocArticleBySlug,
	getAdjacentDocArticles,
} from './docs-data';

describe('Documentation Data & Engine', () => {
	it('defines all required categories with valid articles', () => {
		expect(DOCS_CATEGORIES.length).toBeGreaterThanOrEqual(5);

		for (const category of DOCS_CATEGORIES) {
			expect(category.id).toBeTruthy();
			expect(category.title).toBeTruthy();
			expect(category.articles.length).toBeGreaterThan(0);

			for (const article of category.articles) {
				expect(article.slug).toBeTruthy();
				expect(article.title).toBeTruthy();
				expect(article.description).toBeTruthy();
			}
		}
	});

	it('ensures all category articles exist in the DOC_ARTICLES map', () => {
		for (const category of DOCS_CATEGORIES) {
			for (const article of category.articles) {
				const fullArticle = DOC_ARTICLES[article.slug];
				expect(fullArticle).toBeDefined();
				expect(fullArticle.slug).toBe(article.slug);
				expect(fullArticle.title).toBe(article.title);
				expect(fullArticle.category).toBe(category.title);
				expect(fullArticle.headings.length).toBeGreaterThan(0);
				expect(fullArticle.sections.length).toBeGreaterThan(0);
			}
		}
	});

	it('returns all slugs with getAllDocSlugs', () => {
		const slugs = getAllDocSlugs();
		expect(slugs).toContain('introduction');
		expect(slugs).toContain('quick-start');
		expect(slugs).toContain('architecture');
		expect(slugs).toContain('seller-payouts');
		expect(slugs).toContain('api-webhooks');
		expect(slugs).toContain('faq');
	});

	it('fetches specific article by slug correctly', () => {
		const intro = getDocArticleBySlug('introduction');
		expect(intro).toBeDefined();
		expect(intro?.title).toBe('Welcome to GoCart');

		const nonExistent = getDocArticleBySlug('non-existent-slug-12345');
		expect(nonExistent).toBeUndefined();
	});

	it('calculates adjacent next and previous articles correctly', () => {
		const introAdjacent = getAdjacentDocArticles('introduction');
		expect(introAdjacent.prev).toBeUndefined();
		expect(introAdjacent.next).toBeDefined();
		expect(introAdjacent.next?.slug).toBe('quick-start');

		const quickStartAdjacent = getAdjacentDocArticles('quick-start');
		expect(quickStartAdjacent.prev?.slug).toBe('introduction');
		expect(quickStartAdjacent.next?.slug).toBe('architecture');
	});
});
