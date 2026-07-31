'use client';

// React imports
import { useEffect, useState } from 'react';

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
import { ChevronLeft, ChevronRight, FilePlus2, Search, Loader2 } from 'lucide-react';

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
	// Server-side pagination props (optional)
	totalCount?: number;
	pageCount?: number;
	pageIndex?: number; // 0-based
	onPageChange?: (page: number) => void; // 1-based page
	onPageSizeChange?: (pageSize: number) => void;
	onSearchChange?: (search: string) => void;
	searchValue?: string;
	isLoading?: boolean;
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
	totalCount,
	pageCount: serverPageCount,
	pageIndex: serverPageIndex,
	onPageChange,
	onPageSizeChange,
	onSearchChange,
	searchValue = '',
	isLoading = false,
}: DataTableProps<TData, TValue>) {
	// Modal state
	const { setOpen } = useModal();

	const isServerMode = Boolean(onPageChange);
	const [searchInput, setSearchInput] = useState(searchValue);

	// Synchronize search input if external searchValue changes
	useEffect(() => {
		setSearchInput(searchValue);
	}, [searchValue]);

	// Debounce search input for server-side search
	useEffect(() => {
		if (!isServerMode || !onSearchChange) return;
		const timer = setTimeout(() => {
			if (searchInput !== searchValue) {
				onSearchChange(searchInput);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput, isServerMode, onSearchChange, searchValue]);

	// React table instance
	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: isServerMode ? undefined : getFilteredRowModel(),
		getPaginationRowModel: isServerMode ? undefined : getPaginationRowModel(),
		initialState: {
			pagination: {
				pageSize,
			},
		},
		manualPagination: isServerMode,
		pageCount: isServerMode ? serverPageCount : undefined,
	});

	const currentPageIndex = isServerMode ? (serverPageIndex ?? 0) : table.getState().pagination.pageIndex;
	const totalPages = isServerMode ? (serverPageCount ?? 1) : (table.getPageCount() || 1);
	const canPrevious = isServerMode ? currentPageIndex > 0 : table.getCanPreviousPage();
	const canNext = isServerMode ? currentPageIndex + 1 < totalPages : table.getCanNextPage();
	const itemsShown = isServerMode ? data.length : table.getRowModel().rows.length;
	const totalItems = isServerMode ? (totalCount ?? data.length) : table.getFilteredRowModel().rows.length;

	return (
		<>
			{/* Search input and action button */}
			{!noHeader && (
				<div className='flex items-center justify-between'>
					<div className='flex items-center py-4 gap-2 relative'>
						<Search className='text-muted-foreground' />
						<Input
							placeholder={searchPlaceholder}
							value={
								isServerMode
									? searchInput
									: (filterValue ? (table.getColumn(filterValue)?.getFilterValue() as string) ?? '' : '')
							}
							onChange={(event) => {
								const val = event.target.value;
								if (isServerMode) {
									setSearchInput(val);
								} else if (filterValue) {
									table.getColumn(filterValue)?.setFilterValue(val);
								}
							}}
							className='h-12 w-72'
						/>
						{isLoading && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground ml-2' />}
					</div>
					<div className='flex gap-x-2'>
						{modalChildren && (
							<Button
								className='flex gap-2'
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
			)}

			{/* Table */}
			<div className='overflow-x-auto border bg-background rounded-lg relative'>
				<Table className=''>
					{/* Table header */}
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

					{/* Table body */}
					<TableBody>
						{data.length ? (
							table.getRowModel().rows.map((row) => {
								return (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && 'selected'}
										className='group/row transition-colors duration-200 hover:bg-muted/40'
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
									{isLoading ? 'Loading...' : 'No Results.'}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Table Pagination Controls */}
			<div className='flex items-center justify-between py-4 px-2'>
				<div className='text-sm text-muted-foreground'>
					Showing {itemsShown} of {totalItems} item(s)
				</div>
				<div className='flex items-center gap-6'>
					<div className='flex items-center gap-2'>
						<span className='text-sm font-medium'>Rows per page</span>
						<select
							value={isServerMode ? pageSize : table.getState().pagination.pageSize}
							onChange={(e) => {
								const newSize = Number(e.target.value);
								if (isServerMode) {
									onPageSizeChange?.(newSize);
								} else {
									table.setPageSize(newSize);
								}
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
						Page {currentPageIndex + 1} of {totalPages}
					</div>

					<div className='flex items-center gap-2'>
						<Button
							variant='outline'
							size='sm'
							onClick={() => {
								if (isServerMode) {
									onPageChange?.(currentPageIndex); // 1-based previous page
								} else {
									table.previousPage();
								}
							}}
							disabled={!canPrevious || isLoading}
							className='h-9 px-3'
						>
							<ChevronLeft className='h-4 w-4 me-1' /> Previous
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={() => {
								if (isServerMode) {
									onPageChange?.(currentPageIndex + 2); // 1-based next page
								} else {
									table.nextPage();
								}
							}}
							disabled={!canNext || isLoading}
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
