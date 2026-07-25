'use client';
import Pagination from '@/components/store/shared/pagination';
import ProductList from '@/components/store/shared/product-list';
import { getProductsByIds } from '@/queries/product';
import { useEffect, useState, FC } from 'react';

interface HistoryContentProps {
	initialPage: number;
}

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

const HistoryContent: FC<HistoryContentProps> = ({ initialPage }) => {
	const [currentPage, setCurrentPage] = useState<number>(initialPage);
	const [historyIds, setHistoryIds] = useState<string[]>([]);
	const [isMounted, setIsMounted] = useState<boolean>(false);

	useEffect(() => {
		setIsMounted(true);
		const historyString = localStorage.getItem('productHistory');
		if (historyString) {
			try {
				const productHistory = JSON.parse(historyString);
				if (Array.isArray(productHistory)) {
					setHistoryIds(productHistory);
				}
			} catch (error) {
				console.error('Error parsing product history:', error);
			}
		}
	}, []);

	const { data: res, isLoading } = useQuery({
		queryKey: queryKeys.profile.history(historyIds, currentPage),
		queryFn: () => getProductsByIds(historyIds, currentPage),
		enabled: isMounted && historyIds.length > 0,
	});

	const products = res ? res.products : [];
	const totalPages = res ? res.totalPages : 0;

	// Remove duplicates
	const seenIds = new Set<string>();
	const uniqueProducts = (products || []).filter((product: any) => {
		if (!product) return false;
		const isDuplicate = seenIds.has(product.id);
		seenIds.add(product.id);
		return !isDuplicate;
	});

	const loading = !isMounted || (isLoading && historyIds.length > 0);

	return (
		<div className='bg-background py-4 px-6 rounded-xl'>
			<h1 className='text-lg mb-5 font-bold'>Your product view history</h1>
			{loading ? (
				<div className='flex items-center justify-center h-48'>
					<div className='flex space-x-2'>
						<div
							className='w-4 h-4 bg-primary rounded-full animate-pulse'
							style={{ animationDelay: '0s' }}
						></div>
						<div
							className='w-4 h-4 bg-primary rounded-full animate-pulse'
							style={{ animationDelay: '0.2s' }}
						></div>
						<div
							className='w-4 h-4 bg-primary rounded-full animate-pulse'
							style={{ animationDelay: '0.4s' }}
						></div>
					</div>
					<span className='sr-only'>Loading...</span>
				</div>
			) : uniqueProducts.length > 0 ? (
				<div className='pb-16'>
					<ProductList products={uniqueProducts as any} />
					<div className='mt-2'>
						<Pagination
							page={currentPage}
							setPage={setCurrentPage}
							totalPages={totalPages}
						/>
					</div>
				</div>
			) : (
				<div>No products</div>
			)}
		</div>
	);
};

export default HistoryContent;
