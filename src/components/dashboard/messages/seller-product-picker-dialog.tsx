'use client';

import React, { FC, useState } from 'react';
import Image from 'next/image';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Loader2, Plus, Check, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getStoreCatalogForChat, StoreCatalogItem } from '@/queries/messages';

interface Props {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	storeUrl: string;
	onSelectProduct?: (product: StoreCatalogItem) => void;
	onSelectProducts?: (products: StoreCatalogItem[]) => void;
}

export const SellerProductPickerDialog: FC<Props> = ({
	isOpen,
	onOpenChange,
	storeUrl,
	onSelectProduct,
	onSelectProducts,
}) => {
	const [search, setSearch] = useState('');
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const { data, isLoading } = useQuery({
		queryKey: ['store-chat-catalog', storeUrl],
		queryFn: () => getStoreCatalogForChat(storeUrl),
		enabled: isOpen,
	});

	const products = data?.products ?? [];
	const filteredProducts = products.filter((p) =>
		p.name.toLowerCase().includes(search.toLowerCase().trim())
	);

	const toggleProductSelection = (productId: string) => {
		setSelectedIds((prev) =>
			prev.includes(productId)
				? prev.filter((id) => id !== productId)
				: [...prev, productId]
		);
	};

	const handleQuickSendSingle = (product: StoreCatalogItem) => {
		if (onSelectProducts) {
			onSelectProducts([product]);
		} else if (onSelectProduct) {
			onSelectProduct(product);
		}
		setSelectedIds([]);
		onOpenChange(false);
	};

	const handleSendSelected = () => {
		const selectedItems = products.filter((p) => selectedIds.includes(p.id));
		if (selectedItems.length === 0) return;

		if (onSelectProducts) {
			onSelectProducts(selectedItems);
		} else if (onSelectProduct && selectedItems[0]) {
			onSelectProduct(selectedItems[0]);
		}
		setSelectedIds([]);
		onOpenChange(false);
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) setSelectedIds([]);
				onOpenChange(open);
			}}
		>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2 text-base'>
						<Package className='w-4 h-4 text-blue-600 dark:text-blue-400' />
						<span>Recommend Products to Customer</span>
					</DialogTitle>
					<DialogDescription className='text-xs'>
						Select one or multiple products from your store catalog to suggest in this chat with 1-click checkout options.
					</DialogDescription>
				</DialogHeader>

				{/* Search bar */}
				<div className='relative my-1'>
					<Search className='w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
					<Input
						placeholder='Search products by title...'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className='pl-8 text-xs h-9 bg-muted/20 border-border/70'
					/>
				</div>

				{/* Selection Bar */}
				{selectedIds.length > 0 && (
					<div className='flex items-center justify-between py-1.5 px-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs'>
						<span className='font-medium text-blue-600 dark:text-blue-400'>
							{selectedIds.length} product{selectedIds.length > 1 ? 's' : ''} selected
						</span>
						<Button
							type='button'
							variant='ghost'
							size='sm'
							onClick={() => setSelectedIds([])}
							className='h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground'
						>
							Clear selection
						</Button>
					</div>
				)}

				{/* Products list */}
				<div className='max-h-80 overflow-y-auto space-y-2 pr-1'>
					{isLoading ? (
						<div className='flex items-center justify-center py-10 text-xs text-muted-foreground gap-2'>
							<Loader2 className='w-4 h-4 animate-spin text-blue-600' />
							<span>Loading store catalog...</span>
						</div>
					) : filteredProducts.length === 0 ? (
						<div className='py-8 text-center text-xs text-muted-foreground'>
							No products found.
						</div>
					) : (
						filteredProducts.map((p) => {
							const isChecked = selectedIds.includes(p.id);
							return (
								<div
									key={p.id}
									onClick={() => toggleProductSelection(p.id)}
									className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors gap-3 cursor-pointer ${
										isChecked
											? 'border-blue-500 bg-blue-500/5 dark:bg-blue-950/20'
											: 'border-border/60 bg-card hover:bg-muted/40'
									}`}
								>
									<div className='flex items-center gap-3 min-w-0 flex-1'>
										{/* Checkbox indicator */}
										<div
											className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
												isChecked
													? 'bg-blue-600 border-blue-600 text-white'
													: 'border-muted-foreground/40 bg-background'
											}`}
										>
											{isChecked && <Check className='w-3 h-3 stroke-[3]' />}
										</div>

										<div className='relative w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/40'>
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

										<div className='min-w-0 flex-1'>
											<p className='text-xs font-semibold text-foreground truncate'>
												{p.name}
											</p>
											<div className='flex items-center gap-2 mt-0.5'>
												<span className='text-xs font-bold text-emerald-600 dark:text-emerald-400'>
													${p.price.toFixed(2)}
												</span>
												{p.size && (
													<Badge
														variant='outline'
														className='text-[9px] py-0 h-4 px-1.5 font-mono text-muted-foreground'
													>
														{p.size}
													</Badge>
												)}
											</div>
										</div>
									</div>

									<Button
										type='button'
										size='sm'
										variant='ghost'
										onClick={(e) => {
											e.stopPropagation();
											handleQuickSendSingle(p);
										}}
										className='h-7 px-2 text-[11px] gap-1 shrink-0 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30'
										title='Send only this product immediately'
									>
										<Plus className='w-3 h-3' />
										<span>Quick Send</span>
									</Button>
								</div>
							);
						})
					)}
				</div>

				<DialogFooter className='sm:justify-between items-center pt-2 border-t'>
					<p className='text-[11px] text-muted-foreground'>
						{selectedIds.length > 0
							? `${selectedIds.length} item${selectedIds.length > 1 ? 's' : ''} ready to send`
							: 'Select one or more items to send together'}
					</p>
					<Button
						type='button'
						disabled={selectedIds.length === 0}
						onClick={handleSendSelected}
						className='h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs'
					>
						<Send className='w-3 h-3' />
						<span>
							Send {selectedIds.length > 0 ? `(${selectedIds.length})` : ''} Suggestions
						</span>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default SellerProductPickerDialog;
