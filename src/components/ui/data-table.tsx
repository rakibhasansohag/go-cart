'use client';

// Custom components
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Table components
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

// Tanstack react table
import {
	ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	useReactTable,
} from '@tanstack/react-table';

// Lucide icons
import { ChevronLeft, ChevronRight, FilePlus2, Search } from 'lucide-react';

// Modal provider hook
import { useModal } from '@/providers/modal-provider';
import Link from 'next/link';
import CustomModal from '../dashboard/shared/custom-modal';

// Props interface for the table component
interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	filterValue: string;
	actionButtonText?: React.ReactNode;
	modalChildren?: React.ReactNode;
	newTabLink?: string;
	searchPlaceholder: string;
	heading?: string;
	subheading?: string;
	noHeader?: true;
	maxWidth?: string;
	pageSize?: number;
}

export default function DataTable<TData, TValue>({
	columns,
	data,
	filterValue,
	modalChildren,
	actionButtonText,
	searchPlaceholder,
	heading,
	subheading,
	noHeader,
	newTabLink,
	maxWidth,
	pageSize = 10,
}: DataTableProps<TData, TValue>) {
	// Modal state
	const { setOpen } = useModal();

	// React table instance
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: {
			pagination: {
				pageSize,
			},
		},
	});

	return (
		<>
			{/* Search input and action button */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center py-4 gap-2'>
					<Search />
					<Input
						placeholder={searchPlaceholder}
						value={
							(table.getColumn(filterValue)?.getFilterValue() as string) ?? ''
						}
						onChange={(event) =>
							table.getColumn(filterValue)?.setFilterValue(event.target.value)
						}
						className='h-12'
					/>
				</div>
				<div className='flex gap-x-2'>
					{modalChildren && (
						<Button
							className='flex- gap-2'
							onClick={() => {
								if (modalChildren)
									setOpen(
										<CustomModal
											heading={heading || ''}
											subheading={subheading || ''}
											maxWidth={maxWidth}
										>
											{modalChildren}
										</CustomModal>,
									);
							}}
						>
							{actionButtonText}
						</Button>
					)}
					{newTabLink && (
						<Link href={newTabLink}>
							<Button variant='outline'>
								<FilePlus2 className='me-1' /> Create in new page
							</Button>
						</Link>
					)}
				</div>
			</div>

			{/* Table */}
			<div className=' border bg-background rounded-lg'>
				<Table className=''>
					{/* Table header */}
					{!noHeader && (
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										return (
											<TableHead key={header.id}>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
													  )}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
					)}

					{/* Table body */}
					<TableBody>
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => {
								return (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && 'selected'}
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell
												key={cell.id}
												className='max-w-[400px] break-words'
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								);
							})
						) : (
							// No results message
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className='h-24 text-center'
								>
									No Results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Table Pagination Controls */}
			<div className='flex items-center justify-between py-4 px-2'>
				<div className='text-sm text-muted-foreground'>
					Showing {table.getRowModel().rows.length} of{' '}
					{table.getFilteredRowModel().rows.length} item(s)
				</div>
				<div className='flex items-center gap-6'>
					<div className='flex items-center gap-2'>
						<span className='text-sm font-medium'>Rows per page</span>
						<select
							value={table.getState().pagination.pageSize}
							onChange={(e) => {
								table.setPageSize(Number(e.target.value));
							}}
							className='h-9 w-[70px] rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer'
						>
							{[5, 10, 20, 50].map((size) => (
								<option key={size} value={size}>
									{size}
								</option>
							))}
						</select>
					</div>

					<div className='text-sm font-medium'>
						Page {table.getState().pagination.pageIndex + 1} of{' '}
						{table.getPageCount() || 1}
					</div>

					<div className='flex items-center gap-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
							className='h-9 px-3'
						>
							<ChevronLeft className='h-4 w-4 me-1' /> Previous
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
							className='h-9 px-3'
						>
							Next <ChevronRight className='h-4 w-4 ms-1' />
						</Button>
					</div>
				</div>
			</div>
		</>
	);
}
