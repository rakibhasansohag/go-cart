'use client';

// React, Next.js imports
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// UI components
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Hooks and utilities
import { useModal } from '@/providers/modal-provider';

// Lucide icons
import { CopyPlus, FilePenLine, Layers, MoreHorizontal, Trash } from 'lucide-react';

// Queries
import { deleteProduct } from '@/queries/product';

// Tanstack React Query & Table
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useParams } from 'next/navigation';
import { queryKeys } from '@/lib/query-keys';

// Types
import { StoreProductType } from '@/lib/types';
import { toast } from 'sonner';

export const columns: ColumnDef<StoreProductType>[] = [
	{
		accessorKey: 'name',
		header: '',
		cell: ({ row }) => {
			return (
				<div className='flex flex-col gap-y-3'>
					{/* Product name */}
					<h1 className='font-bold truncate pb-3 border-b capitalize'>
						{row.original.name}
					</h1>
					{/* Product variants — show first 2, then a prominent link to all */}
					<div className='flex flex-col gap-3'>
						<div className='flex flex-wrap gap-3 items-start'>
							{row.original.variants.slice(0, 2).map((variant) => (
								<div key={variant.id} className='flex flex-col gap-y-2 group w-64 shrink-0'>
									<div className='relative cursor-pointer border border-border/70 rounded-xl p-2.5 bg-card/50 hover:bg-card transition-all shadow-xs overflow-hidden'>
										<div className='relative w-full h-40 rounded-lg overflow-hidden border border-border/40 bg-muted/20'>
											<Image
												src={variant.images[0]?.url || '/placeholder.png'}
												alt={`${variant.variantName} image`}
												fill
												sizes='250px'
												className='object-cover transition-transform duration-200 group-hover:scale-105'
											/>
											<Link
												href={`/dashboard/seller/stores/${row.original.store.url}/products/${row.original.id}/variants/${variant.id}`}
											>
												<div className='absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-medium'>
													<FilePenLine className='w-4 h-4' /> Edit Variant
												</div>
											</Link>
										</div>
										{/* Info */}
										<div className='flex mt-2.5 gap-2 p-0.5 items-start min-w-0'>
											{/* Colors */}
											{variant.colors.length > 0 && (
												<div className='flex flex-col gap-1 rounded-md shrink-0 mt-0.5'>
													{variant.colors.map((color) => (
														<span
															key={color.name}
															className='w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs'
															style={{ backgroundColor: color.name }}
														/>
													))}
												</div>
											)}
											<div className='min-w-0 flex-1 space-y-1.5'>
												{/* Name of variant */}
												<h1 className='capitalize text-xs font-bold truncate text-foreground'>
													{variant.variantName}
												</h1>
												{/* Sizes */}
												<div className='flex flex-col gap-1 w-full overflow-hidden'>
													{variant.sizes.map((size) => {
														const isOut = size.quantity === 0;
														const isLow = size.quantity > 0 && size.quantity < 5;
														return (
															<span
																key={size.size}
																className={`w-full max-w-full px-2 py-0.5 rounded-md text-[11px] font-medium border flex items-center gap-1.5 truncate ${
																	isOut
																		? 'bg-destructive/10 text-destructive border-destructive/30'
																		: isLow
																		? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
																		: 'bg-muted/30 text-foreground border-border/80'
																}`}
																title={`${size.size} · ${size.quantity} in stock · $${size.price}`}
															>
																<span
																	className={`w-1.5 h-1.5 rounded-full shrink-0 ${
																		isOut
																			? 'bg-destructive'
																			: isLow
																			? 'bg-amber-500'
																			: 'bg-emerald-500'
																	}`}
																/>
																<span className='truncate'>
																	{size.size} · {size.quantity} stock · ${size.price}
																</span>
															</span>
														);
													})}
												</div>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>

						{/* View all variants link — always shown when more than 2 variants exist */}
						{row.original.variants.length > 2 && (
							<Link
								href={`/dashboard/seller/stores/${row.original.store.url}/products/${row.original.id}/variants`}
								className='inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors'
							>
								<Layers className='w-3.5 h-3.5' />
								View all {row.original.variants.length} variants
							</Link>
						)}
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: 'category',
		header: 'Category',
		cell: ({ row }) => {
			return <span>{row.original.category.name}</span>;
		},
	},
	{
		accessorKey: 'subCategory',
		header: 'SubCategory',
		cell: ({ row }) => {
			return <span>{row.original.subCategory.name}</span>;
		},
	},
	{
		accessorKey: 'offerTag',
		header: 'Offer',
		cell: ({ row }) => {
			const offerTag = row.original.offerTag;
			return <span>{offerTag ? offerTag.name : '-'}</span>;
		},
	},
	{
		accessorKey: 'brand',
		header: 'Brand',
		cell: ({ row }) => {
			return <span>{row.original.brand}</span>;
		},
	},

	{
		accessorKey: 'new-variant',
		header: '',
		cell: ({ row }) => {
			return (
				<Link
					href={`/dashboard/seller/stores/${row.original.store.url}/products/${row.original.id}/variants/new`}
				>
					<CopyPlus className='hover:text-blue-200' />
				</Link>
			);
		},
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			const rowData = row.original;

			return <CellActions productId={rowData.id} />;
		},
	},
];

// Define props interface for CellActions component
interface CellActionsProps {
	productId: string;
}

// CellActions component definition
const CellActions: React.FC<CellActionsProps> = ({ productId }) => {
	// Hooks
	const { setClose } = useModal();
	const queryClient = useQueryClient();
	const params = useParams<{ storeUrl: string }>();

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteProduct(id),
		onSuccess: () => {
			toast('Deleted product', {
				description: 'The product has been deleted.',
			});
			if (params?.storeUrl) {
				queryClient.invalidateQueries({
					queryKey: queryKeys.dashboard.products(params.storeUrl),
				});
			}
			setClose();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to delete product');
		},
	});

	// Return null if rowData or rowData.id don't exist
	if (!productId) return null;

	const editHref = `/dashboard/seller/stores/${params.storeUrl}/products/${productId}`;

	return (
		<AlertDialog>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='ghost' className='h-8 w-8 p-0 transition-transform duration-150 hover:scale-110 active:scale-95 hover:bg-accent'>
						<span className='sr-only'>Open menu</span>
						<MoreHorizontal className='h-4 w-4' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<DropdownMenuLabel>Actions</DropdownMenuLabel>
					{params?.storeUrl && (
						<Link href={editHref}>
							<DropdownMenuItem className='flex gap-2 cursor-pointer'>
								<FilePenLine size={15} /> Edit product info
							</DropdownMenuItem>
						</Link>
					)}
					<AlertDialogTrigger asChild>
						<DropdownMenuItem className='flex gap-2 text-destructive focus:text-destructive cursor-pointer' onClick={() => {}}>
							<Trash size={15} /> Delete product
						</DropdownMenuItem>
					</AlertDialogTrigger>
				</DropdownMenuContent>
			</DropdownMenu>
			<AlertDialogContent className='max-w-lg'>
				<AlertDialogHeader>
					<AlertDialogTitle className='text-left'>
						Are you absolutely sure?
					</AlertDialogTitle>
					<AlertDialogDescription className='text-left'>
						This action cannot be undone. This will permanently delete the
						product and variants that exist inside product.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className='flex items-center'>
					<AlertDialogCancel className='mb-2'>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={deleteMutation.isPending}
						className='bg-destructive hover:bg-destructive mb-2 text-white'
						onClick={() => {
							deleteMutation.mutate(productId);
						}}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
