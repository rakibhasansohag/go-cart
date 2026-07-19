'use client';
import { ProductWishlistType } from '@/lib/types';
import ProductList from '../../shared/product-list';
import Pagination from '../../shared/pagination';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getUserWishlist } from '@/queries/profile';

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
				<div>No products</div>
			)}
		</div>
	);
}
