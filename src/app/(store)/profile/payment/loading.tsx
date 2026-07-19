import { Skeleton } from '@/components/ui/skeleton';

export default function PaymentsLoading() {
	return (
		<div className='overflow-hidden mt-5 rounded-xl'>
			<div className='bg-background px-6 py-5'>
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
	);
}
