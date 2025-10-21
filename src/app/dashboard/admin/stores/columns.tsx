'use client';

// React, Next.js imports
import { useState } from 'react';
import Image from 'next/image';
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
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Hooks and utilities
import { useModal } from '@/providers/modal-provider';

// Lucide icons
import {
	BadgeCheck,
	BadgeMinus,
	Expand,
	MoreHorizontal,
	Trash,
} from 'lucide-react';

// Queries
import { deleteStore } from '@/queries/store';

// Tanstack React Table
import { ColumnDef } from '@tanstack/react-table';

// Prisma models
import { AdminStoreType, StoreStatus } from '@/lib/types';
import StoreStatusSelect from '@/components/dashboard/forms/store-status-select';
import StoreSummary from '@/components/dashboard/shared/store-summary';
import { toast } from 'sonner';
import DescriptionCell from '../../../../components/shared/descriptionCell';

export const columns: ColumnDef<AdminStoreType>[] = [
	{
		accessorKey: 'cover',
		header: '',
		cell: ({ row }) => {
			return (
				<div className='relative h-44 min-w-64 rounded-xl overflow-hidden'>
					<Image
						src={row.original.cover}
						alt=''
						width={500}
						height={300}
						className='w-96 h-40 rounded-md object-cover shadow-sm'
					/>
					<Image
						src={row.original.logo}
						alt=''
						width={200}
						height={200}
						className='w-24 h-24  rounded-full object-cover shadow-2xl absolute top-1/2 -translate-y-1/2 left-4'
					/>
				</div>
			);
		},
	},
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
		accessorKey: 'description',
		header: 'Description',
		cell: ({ row }) => {
			return (
				<div className='max-w-[8rem] '>
					<DescriptionCell
						title={row.original.name}
						html={row.original.description}
					/>
				</div>
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
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => {
			return (
				<StoreStatusSelect
					storeId={row.original.id}
					status={row.original.status as StoreStatus}
				/>
			);
		},
	},
	{
		accessorKey: 'featured',
		header: 'Featured',
		cell: ({ row }) => {
			return (
				<span className='text-muted-foreground flex justify-center'>
					{row.original.featured ? (
						<BadgeCheck className='stroke-green-300' />
					) : (
						<BadgeMinus />
					)}
				</span>
			);
		},
	},
	{
		accessorKey: 'open',
		header: '',
		cell: ({ row }) => {
			return <OpenButton store={row.original} />;
		},
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			const rowData = row.original;

			return <CellActions storeId={rowData.id} />;
		},
	},
];

// Define props interface for CellActions component
interface CellActionsProps {
	storeId: string;
}

// CellActions component definition
const CellActions: React.FC<CellActionsProps> = ({ storeId }) => {
	// Hooks
	const { setClose } = useModal();
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	// Return null if rowData or rowData.id don't exist
	if (!storeId) return null;

	return (
		<AlertDialog>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='ghost' className='h-8 w-8 p-0'>
						<span className='sr-only'>Open menu</span>
						<MoreHorizontal className='h-4 w-4' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<DropdownMenuLabel>Actions</DropdownMenuLabel>

					<AlertDialogTrigger asChild>
						<DropdownMenuItem className='flex gap-2' onClick={() => {}}>
							<Trash size={15} /> Delete store
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
						This action cannot be undone. This will permanently delete the store
						and related data.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className='flex items-center'>
					<AlertDialogCancel className='mb-2'>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={loading}
						className='bg-destructive hover:bg-destructive mb-2 text-main-primary'
						onClick={async () => {
							setLoading(true);
							await deleteStore(storeId);
							toast.info('Store deleted successfully');
							setLoading(false);
							router.refresh();
							setClose();
						}}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
const OpenButton: React.FC<{ store: AdminStoreType }> = ({ store }) => {
	const { setOpen } = useModal();

	return (
		<button
			className='
        relative z-10 px-4 py-2 rounded-full border-2
        bg-[#0A0D2D] text-gray-50 font-sans lg:font-semibold
        flex items-center justify-center gap-2 mx-auto text-lg
        overflow-hidden transition-transform duration-300 ease-out
        transform
        /* hover / focus */
        hover:scale-105 hover:shadow-2xl hover:-translate-y-0.5
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-main-primary/60
        group cursor-pointer
      '
			onClick={() => {
				setOpen(
					<CustomModal maxWidth='!max-w-3xl'>
						<StoreSummary store={store} />
					</CustomModal>,
				);
			}}
		>
			View
			<span className='w-7 h-7 rounded-full bg-background grid place-items-center transition-transform duration-300 transform group-hover:rotate-12 group-hover:translate-x-1'>
				<Expand className='w-5 stroke-black dark:stroke-white' />
			</span>
		</button>
	);
};
