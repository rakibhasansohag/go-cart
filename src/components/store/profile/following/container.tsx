'use client';
import { useRouter } from 'next/navigation';
import { FC, useEffect, useState } from 'react';
import Pagination from '../../shared/pagination';
import StoreCard from '../../cards/store-card';

import { useSuspenseQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getUserFollowedStores } from '@/queries/profile';

interface Props {
	page: number;
}

const FollowingContainer: FC<Props> = ({ page }) => {
	const { data: res } = useSuspenseQuery({
		queryKey: queryKeys.profile.following(page),
		queryFn: () => getUserFollowedStores(page),
	});

	const router = useRouter();
	const [currentPage, setPage] = useState<number>(page);

	useEffect(() => {
		if (currentPage !== page) {
			router.push(`/profile/following/${currentPage}`);
		}
	}, [currentPage, page]);

	const stores = res.stores;
	const totalPages = res.totalPages;

	return (
		<div>
			{stores.length > 0 ? (
				<>
					<div className='flex flex-wrap pb-16'>
						{stores.map((store) => (
							<StoreCard key={store.id} store={store} />
						))}
					</div>
					<Pagination page={page} setPage={setPage} totalPages={totalPages} />
				</>
			) : (
				<div>No followed stores</div>
			)}
		</div>
	);
};

export default FollowingContainer;
