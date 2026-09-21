'use client';
import { ProductWishlistType } from '@/lib/types';
import ProductList from '../../shared/product-list';
import Pagination from '../../shared/pagination';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getUserWishlist } from '@/queries/profile';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WishlistContainer({
	page,
}: {
	page: number;
}) {
	const { data: res } = useSuspenseQuery({
		queryKey: queryKeys.profile.wishlist(page),
		queryFn: () => getUserWishlist(page),
	});

	const router = useRouter();
	const [currentPage, setPage] = useState<number>(page);

	useEffect(() => {
		if (currentPage !== page) {
			router.push(`/profile/wishlist/${currentPage}`);
		}
	}, [currentPage, page]);

	const products = res.wishlist;
	const totalPages = res.totalPages;

	return (
		<div>
			{products.length > 0 ? (
				<>
					<div className='w-full pb-16'>
						<ProductList products={products} />
					</div>
					<Pagination page={page} setPage={setPage} totalPages={totalPages} />
				</>
			) : (
				<div className='flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-border/70 bg-card/40 my-6'>
					<div className='w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground'>
						<Heart className='w-8 h-8 text-rose-500/80' />
					</div>
					<h3 className='text-lg font-semibold text-foreground mb-1'>Your wishlist is empty</h3>
					<p className='text-sm text-muted-foreground max-w-sm mb-6'>
						Save items you want to view or buy later by clicking the heart icon while exploring products.
					</p>
					<Button asChild className='rounded-full px-6 font-medium'>
						<Link href='/browse'>Explore Products</Link>
					</Button>
				</div>
			)}
		</div>
	);
}
