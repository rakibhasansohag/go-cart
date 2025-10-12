'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import Pagination from '@/components/store/shared/pagination';
import ProductList from '@/components/store/shared/product-list';
import { getProductsByIds } from '@/queries/product';
import { useEffect, useState, FC } from 'react';

interface HistoryContentProps {
	initialPage: number;
}

const HistoryContent: FC<HistoryContentProps> = ({ initialPage }) => {
	const [products, setProducts] = useState<any>([]);
	const [currentPage, setCurrentPage] = useState<number>(initialPage);
	const [totalPages, setTotalPages] = useState<number>(0);
	const [loading, setLoading] = useState<boolean>(true); // Set initial loading to true

	useEffect(() => {
		// Fetch history from localStorage
		const fetchHistory = async () => {
			const historyString = localStorage.getItem('productHistory');
			if (!historyString) {
				setProducts([]);
				setTotalPages(0);
				setLoading(false);
				return;
			}

			try {
				const pageNumber = currentPage;
				setLoading(true);

				const productHistory = JSON.parse(historyString);

				// Fetch products by ids
				const res = await getProductsByIds(productHistory, pageNumber);

				// Remove duplicates
				const seenIds = new Set();
				const uniqueProducts = res.products.filter((product: any) => {
					const isDuplicate = seenIds.has(product.id);
					seenIds.add(product.id);
					return !isDuplicate;
				});

				setProducts(uniqueProducts);
				setTotalPages(res.totalPages);
				setLoading(false);
			} catch (error) {
				console.error('Error fetching product history:', error);
				setProducts([]);
				setTotalPages(0);
				setLoading(false);
			}
		};

		fetchHistory();
	}, [currentPage]); // Re-fetch data when currentPage state changes

	return (
		<div className='bg-background py-4 px-6'>
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
			) : products.length > 0 ? (
				<div className='pb-16'>
					<ProductList products={products} />
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
