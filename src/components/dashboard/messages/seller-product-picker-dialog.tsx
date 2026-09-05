'use client';

import React, { FC, useState } from 'react';
import Image from 'next/image';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, Loader2, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getStoreCatalogForChat, StoreCatalogItem } from '@/queries/messages';

interface Props {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	storeUrl: string;
	onSelectProduct: (product: StoreCatalogItem) => void;
}

export const SellerProductPickerDialog: FC<Props> = ({
	isOpen,
	onOpenChange,
	storeUrl,
	onSelectProduct,
}) => {
	const [search, setSearch] = useState('');

	const { data, isLoading } = useQuery({
		queryKey: ['store-chat-catalog', storeUrl],
		queryFn: () => getStoreCatalogForChat(storeUrl),
		enabled: isOpen,
	});

	const products = data?.products ?? [];
	const filteredProducts = products.filter((p) =>
		p.name.toLowerCase().includes(search.toLowerCase().trim())
	);

	const handleSelect = (product: StoreCatalogItem) => {
		onSelectProduct(product);
		onOpenChange(false);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<Package className='w-4 h-4 text-primary' />
						Recommend a Product
					</DialogTitle>
					<DialogDescription>
						Select a product from your store inventory to share directly in this conversation.
					</DialogDescription>
				</DialogHeader>

				{/* Search bar */}
				<div className='relative my-2'>
					<Search className='w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
					<Input
						placeholder='Search products by title...'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className='pl-8 text-xs h-9'
					/>
				</div>

				{/* Products list */}
				<div className='max-h-72 overflow-y-auto space-y-2 pr-1'>
					{isLoading ? (
						<div className='flex items-center justify-center py-8 text-xs text-muted-foreground gap-2'>
							<Loader2 className='w-4 h-4 animate-spin' />
							<span>Loading store catalog...</span>
						</div>
					) : filteredProducts.length === 0 ? (
						<div className='py-8 text-center text-xs text-muted-foreground'>
							No products found.
						</div>
					) : (
						filteredProducts.map((p) => (
							<div
								key={p.id}
								className='flex items-center justify-between p-2 rounded-lg border bg-card/60 hover:bg-muted/50 transition-colors gap-3'
							>
								<div className='flex items-center gap-2.5 min-w-0'>
									<div className='relative w-11 h-11 rounded-md bg-muted overflow-hidden shrink-0 border'>
										{p.image ? (
											<Image
												src={p.image}
												alt={p.name}
												fill
												className='object-cover'
											/>
										) : (
											<div className='w-full h-full flex items-center justify-center text-muted-foreground'>
												<Package className='w-4 h-4' />
											</div>
										)}
									</div>
									<div className='min-w-0'>
										<p className='text-xs font-semibold text-foreground truncate'>
											{p.name}
										</p>
										<p className='text-xs font-bold text-primary mt-0.5'>
											${p.price.toFixed(2)}
										</p>
									</div>
								</div>

								<Button
									size='sm'
									onClick={() => handleSelect(p)}
									className='h-8 px-3 text-xs gap-1 shrink-0'
								>
									<Plus className='w-3 h-3' />
									Recommend
								</Button>
							</div>
						))
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default SellerProductPickerDialog;
