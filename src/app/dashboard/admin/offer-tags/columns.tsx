'use client';

// React, Next.js imports
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Custom components
import CustomModal from '@/components/dashboard/shared/custom-modal';

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
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Hooks and utilities

import { useModal } from '@/providers/modal-provider';

// Lucide icons
import { Edit, MoreHorizontal, Trash } from 'lucide-react';

// Queries
import { deleteOfferTag, getOfferTag } from '@/queries/offer-tag';

// Tanstack React Query & Table
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { queryKeys } from '@/lib/query-keys';

// Prisma models
import { OfferTag } from '@prisma/client';

import { toast } from 'sonner';
import OfferTagDetails from '@/components/dashboard/forms/offer-tag-details';

export const columns: ColumnDef<OfferTag>[] = [
	{
		accessorKey: 'name',
		header: 'Name',
		cell: ({ row }) => {
			return (
				<span className='font-extrabold text-lg capitalize'>
					{row.original.name}
				</span>
			);
		},
	},

	{
		accessorKey: 'url',
		header: 'URL',
		cell: ({ row }) => {
			return <span>/{row.original.url}</span>;
		},
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			const rowData = row.original;

			return <CellActions rowData={rowData} />;
		},
	},
];

// Define props interface for CellActions component
interface CellActionsProps {
	rowData: OfferTag;
}

// CellActions component definition
const CellActions: React.FC<CellActionsProps> = ({ rowData }) => {
	// Hooks
	const { setOpen, setClose } = useModal();
	const queryClient = useQueryClient();

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteOfferTag(id),
		onSuccess: () => {
			toast('Deleted category', {
				description: 'The category has been deleted.',
			});
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.offerTags(),
			});
			setClose();
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to delete offer tag');
		},
	});

	// Return null if rowData or rowData.id don't exist
	if (!rowData || !rowData.id) return null;

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
					<DropdownMenuItem
						className='flex gap-2'
						onClick={() => {
							setOpen(
								// Custom modal component
								<CustomModal>
									{/* Offer tag component */}
									<OfferTagDetails data={{ ...rowData }} />
								</CustomModal>,
								async () => {
									return {
										rowData: await getOfferTag(rowData?.id),
									};
								},
							);
						}}
					>
						<Edit size={15} />
						Edit Details
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<AlertDialogTrigger asChild>
						<DropdownMenuItem className='flex gap-2' onClick={() => {}}>
							<Trash size={15} /> Delete offer tag
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
						This action cannot be undone. This will permanently delete the offer
						tag.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className='flex items-center'>
					<AlertDialogCancel className='mb-2'>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={deleteMutation.isPending}
						className='bg-destructive hover:bg-destructive mb-2 text-white'
						onClick={() => {
							deleteMutation.mutate(rowData.id);
						}}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
