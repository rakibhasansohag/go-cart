import { Skeleton } from '@/components/ui/skeleton';

export default function PaymentsLoading() {
	return (
		<div>
			{/* Header skeleton */}
			<div className='pt-4 pb-3 px-4 sm:px-6 bg-background space-y-4 rounded-xl shadow-sm border border-border/10'>
				<div className='flex items-center justify-between'>
					<div className='flex gap-x-6 h-10 items-center'>
						<Skeleton className='h-5 w-16' />
						<Skeleton className='h-5 w-12' />
						<Skeleton className='h-5 w-20' />
					</div>
				</div>
				<div className='flex items-center justify-between gap-4 mt-3'>
					<Skeleton className='h-10 w-full max-w-[500px] rounded-xl' />
					<Skeleton className='h-10 w-44 rounded-xl' />
				</div>
			</div>

			<div className='overflow-hidden mt-5 rounded-xl border border-border/10 shadow-sm'>
				<div className='bg-background px-4 sm:px-6 py-5'>
					<div className='max-h-[700px] overflow-x-auto overflow-y-auto border rounded-md'>
						<table className='w-full min-w-max table-auto text-left'>
							<thead>
								<tr>
									<th className='border-y p-4 text-sm font-semibold'>Payment</th>
									<th className='border-y p-4 text-sm font-semibold'>Intent ID</th>
									<th className='border-y p-4 text-sm font-semibold'>Type</th>
									<th className='border-y p-4 text-sm font-semibold'>Amount</th>
									<th className='border-y p-4 text-sm font-semibold'>Status</th>
									<th className='border-y p-4'></th>
								</tr>
							</thead>
							<tbody>
								{Array.from({ length: 5 }).map((_, i) => (
									<tr key={i} className='border-b'>
										<td className='p-4'>
											<div className='flex flex-col gap-2'>
												<Skeleton className='h-4 w-20' />
												<Skeleton className='h-3 w-32' />
											</div>
										</td>
										<td className='p-4'>
											<Skeleton className='h-4 w-32' />
										</td>
										<td className='p-4'>
											<Skeleton className='h-4 w-20' />
										</td>
										<td className='p-4'>
											<Skeleton className='h-4 w-16' />
										</td>
										<td className='p-4'>
											<Skeleton className='h-4 w-16' />
										</td>
										<td className='p-4'>
											<Skeleton className='h-4 w-8' />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
