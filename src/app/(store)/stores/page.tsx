import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, Store, Star, ArrowRight } from 'lucide-react';
import Header from '@/components/store/layout/header/header';
import CategoriesHeader from '@/components/store/layout/categories-header/categories-header';
import Footer from '@/components/store/layout/footer/footer';
import CatalogImage from '@/components/store/shared/catalog-image';
import { UrlPagination } from '@/components/ui/url-pagination';
import { getPublicStoreDirectory } from '@/queries/store-directory';
import { getSiteUrl } from '@/lib/seo/site-url';

export const metadata: Metadata = {
	title: 'Browse Stores',
	description: 'Explore independent stores on GoCart. Find a store, learn about it and browse its products.',
	alternates: { canonical: `${getSiteUrl()}/stores` },
};

export default async function StoresPage({ searchParams }: {
	searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
	const params = await searchParams;
	const directory = await getPublicStoreDirectory(
		typeof params.q === 'string' ? params.q : '',
		typeof params.page === 'string' ? params.page : '1',
	);
	return <>
		<Header />
		<CategoriesHeader />
		<main className='mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-12'>
			<nav aria-label='Breadcrumb' className='mb-6 text-sm text-muted-foreground'><Link href='/' className='hover:underline'>Home</Link> / Stores</nav>
			<div className='flex flex-wrap items-start justify-between gap-4'>
				<div><h1 className='text-3xl font-bold tracking-tight'>Browse stores</h1><p className='mt-2 text-muted-foreground'>Discover independent sellers and explore their products.</p></div>
				<p className='flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 font-medium'><Store className='size-5 text-emerald-600' />{directory.activeStores} active {directory.activeStores === 1 ? 'store' : 'stores'}</p>
			</div>
			<form action='/stores' className='my-6 flex max-w-xl gap-2' role='search'>
				<label htmlFor='store-search' className='sr-only'>Search stores</label>
				<input id='store-search' name='q' defaultValue={directory.query} placeholder='Search by store name or description' maxLength={100} className='min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm' />
				<button className='inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700'><Search className='size-4' />Search</button>
			</form>
			<div className='mb-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground'>
				<p>{directory.total} {directory.total === 1 ? 'store' : 'stores'}{directory.query ? ` matching “${directory.query}”` : ' to explore'}</p>
				{directory.query && <Link href='/stores' className='font-medium text-emerald-600 hover:underline'>Clear search</Link>}
			</div>
			{directory.stores.length ? <div className='grid gap-6 sm:grid-cols-2 xl:grid-cols-3'>
				{directory.stores.map(store => <Link key={store.id} href={`/store/${encodeURIComponent(store.url)}`} className='group overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-emerald-600' aria-label={`Explore ${store.name}`}>
					<div className='relative h-40 bg-muted'><CatalogImage src={store.cover} alt='' fill sizes='(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw' className='object-cover' /></div>
					<div className='p-5'>
						<div className='flex items-center gap-3'><CatalogImage src={store.logo} alt='' width={48} height={48} className='size-12 rounded-full border border-border object-cover' /><h2 className='min-w-0 break-words text-xl font-semibold'>{store.name}</h2></div>
						<p className='mt-3 line-clamp-3 min-h-15 text-sm leading-5 text-muted-foreground'>{store.description || 'Explore this store’s products and information.'}</p>
						<div className='mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground'>
							<span>{store._count.products} {store._count.products === 1 ? 'product' : 'products'}</span><span>{store._count.followers} followers</span>
							<span className='inline-flex items-center gap-1'><Star className='size-4 text-amber-500' />{store.numReviews > 0 ? `${store.averageRating.toFixed(1)} (${store.numReviews} reviews)` : 'No reviews yet'}</span>
						</div>
						<span className='mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 group-hover:underline'>Explore store <ArrowRight className='size-4' /></span>
					</div>
				</Link>)}
			</div> : <div className='rounded-2xl border border-dashed border-border p-10 text-center'><h2 className='text-xl font-semibold'>No stores found</h2><p className='mt-2 text-muted-foreground'>{directory.query ? 'Try a different name or clear your search.' : 'Stores will appear here once they are active.'}</p></div>}
			<div className='mt-6'><UrlPagination label='Store directory pages' page={directory.page} totalPages={directory.totalPages} total={directory.total} param='page' /></div>
		</main>
		<Footer />
	</>;
}
