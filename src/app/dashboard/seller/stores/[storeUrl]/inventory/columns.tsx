'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Edit, ExternalLink, Minus, Plus, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { queryKeys } from '@/lib/query-keys';
import { InventoryItem, updateSizeQuantity } from '@/queries/inventory';

// Component for Inline Quantity Editing
function QuickStockUpdater({ item }: { item: InventoryItem }) {
	const [quantity, setQuantity] = useState(item.quantity);
	const [isEditing, setIsEditing] = useState(false);
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (newQty: number) => updateSizeQuantity(item.id, newQty),
		onSuccess: (updated) => {
			toast.success(`Stock updated for ${item.productName} (${item.size})`);
			setQuantity(updated.quantity);
			setIsEditing(false);
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.inventory(item.storeUrl),
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.products(item.storeUrl),
			});
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to update stock');
		},
	});

	const handleSave = () => {
		if (quantity === item.quantity) {
			setIsEditing(false);
			return;
		}
		mutation.mutate(quantity);
	};

	const handleIncrement = () => {
		const newQty = quantity + 1;
		setQuantity(newQty);
		mutation.mutate(newQty);
	};

	const handleDecrement = () => {
		if (quantity <= 0) return;
		const newQty = quantity - 1;
		setQuantity(newQty);
		mutation.mutate(newQty);
	};

	return (
		<div className='flex items-center gap-2'>
			<div className='flex items-center border border-border/80 rounded-lg p-0.5 bg-muted/20'>
				<Button
					variant='ghost'
					size='icon'
					className='h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground'
					disabled={quantity <= 0 || mutation.isPending}
					onClick={handleDecrement}
				>
					<Minus className='h-3 w-3' />
				</Button>

				{isEditing ? (
					<Input
						type='number'
						min='0'
						value={quantity}
						onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleSave();
							if (e.key === 'Escape') {
								setQuantity(item.quantity);
								setIsEditing(false);
							}
						}}
						className='w-16 h-7 text-xs text-center border-none p-0 focus-visible:ring-1 focus-visible:ring-primary'
						autoFocus
					/>
				) : (
					<span
						onClick={() => setIsEditing(true)}
						className='w-14 text-center text-xs font-semibold cursor-pointer hover:underline px-1 py-1 rounded'
						title='Click to edit quantity manually'
					>
						{mutation.isPending ? (
							<RefreshCw className='h-3 w-3 animate-spin mx-auto text-primary' />
						) : (
							quantity
						)}
					</span>
				)}

				<Button
					variant='ghost'
					size='icon'
					className='h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground'
					disabled={mutation.isPending}
					onClick={handleIncrement}
				>
					<Plus className='h-3 w-3' />
				</Button>
			</div>

			{isEditing && (
				<Button
					size='icon'
					variant='default'
					className='h-7 w-7 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground'
					onClick={handleSave}
					disabled={mutation.isPending}
				>
					<Check className='h-3.5 w-3.5' />
				</Button>
			)}
		</div>
	);
}

export const columns: ColumnDef<InventoryItem>[] = [
	{
		accessorKey: 'productName',
		header: 'Product & Variant',
		cell: ({ row }) => {
			const item = row.original;
			return (
				<div className='flex items-center gap-3 py-1'>
					{item.variantImage ? (
						<Image
							src={item.variantImage}
							alt={item.productName}
							width={48}
							height={48}
							className='h-12 w-12 rounded-md object-cover border border-border/60 shrink-0 bg-muted/30'
						/>
					) : (
						<div className='h-12 w-12 rounded-md bg-muted/40 border border-border/60 shrink-0 flex items-center justify-center text-xs text-muted-foreground font-semibold'>
							N/A
						</div>
					)}
					<div className='flex flex-col min-w-0'>
						<Link
							href={`/dashboard/seller/stores/${item.storeUrl}/products`}
							className='font-semibold text-sm hover:underline hover:text-primary transition-colors truncate max-w-[220px]'
						>
							{item.productName}
						</Link>
						<span className='text-xs text-muted-foreground truncate max-w-[220px]'>
							Variant: {item.variantName}
						</span>
						{item.sku && (
							<span className='text-[11px] text-muted-foreground font-mono mt-0.5'>
								SKU: {item.sku}
							</span>
						)}
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: 'size',
		header: 'Size',
		cell: ({ row }) => (
			<Badge variant='outline' className='font-mono text-xs px-2 py-0.5 bg-muted/30 border-border/80'>
				{row.original.size}
			</Badge>
		),
	},
	{
		accessorKey: 'price',
		header: 'Price',
		cell: ({ row }) => {
			const item = row.original;
			const finalPrice = item.discount > 0 ? item.price - item.discount : item.price;
			return (
				<div className='flex flex-col text-xs'>
					<span className='font-medium text-foreground'>${finalPrice.toFixed(2)}</span>
					{item.discount > 0 && (
						<span className='line-through text-muted-foreground text-[11px]'>
							${item.price.toFixed(2)}
						</span>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => {
			const qty = row.original.quantity;
			if (qty === 0) {
				return (
					<Badge className='bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20 text-[11px] font-medium'>
						Out of Stock
					</Badge>
				);
			}
			if (qty < 5) {
				return (
					<Badge className='bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 text-[11px] font-medium'>
						Low Stock ({qty})
					</Badge>
				);
			}
			return (
				<Badge className='bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 text-[11px] font-medium'>
					In Stock
				</Badge>
			);
		},
	},
	{
		accessorKey: 'quantity',
		header: 'Adjust Stock',
		cell: ({ row }) => <QuickStockUpdater item={row.original} />,
	},
	{
		id: 'actions',
		header: 'Actions',
		cell: ({ row }) => {
			const item = row.original;
			return (
				<div className='flex items-center gap-1'>
					<Button variant='ghost' size='sm' asChild className='h-8 px-2 text-xs hover:bg-muted'>
						<Link
							href={`/dashboard/seller/stores/${item.storeUrl}/products/${item.productId}/variants/${item.variantId}`}
						>
							<Edit className='h-3.5 w-3.5 mr-1 text-muted-foreground' />
							Edit Variant
						</Link>
					</Button>
				</div>
			);
		},
	},
];
