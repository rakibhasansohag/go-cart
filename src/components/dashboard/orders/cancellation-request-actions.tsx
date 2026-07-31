'use client';

import { Button } from '@/components/ui/button';
import { queryKeys } from '@/lib/query-keys';
import { decidePackageCancellation } from '@/queries/fulfillment';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
	request: {
		id: string;
		reasonCode: string;
		message: string | null;
	};
	storeId: string;
	orderId: string;
	storeUrl?: string;
}

export default function CancellationRequestActions({
	request,
	storeId,
	orderId,
	storeUrl,
}: Props) {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (decision: 'APPROVE' | 'REJECT') =>
			decidePackageCancellation({
				storeId,
				requestId: request.id,
				decision,
				idempotencyKey: crypto.randomUUID(),
			}),
		onSuccess: (result) => {
			toast.success(
				result.status === 'APPROVED'
					? 'Cancellation approved and package closed.'
					: 'Cancellation request rejected.',
			);
			void Promise.all([
				queryClient.invalidateQueries({
					queryKey: storeUrl
						? queryKeys.dashboard.orders(storeUrl)
						: queryKeys.dashboard.orderLists(),
				}),
				queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) }),
				queryClient.invalidateQueries({ queryKey: queryKeys.profile.orderLists() }),
				queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.adminOrders() }),
			]);
		},
		onError: (error: unknown) => {
			toast.error(error instanceof Error ? error.message : String(error));
		},
	});

	return (
		<section
			aria-labelledby={`cancellation-request-${request.id}`}
			className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4'
		>
			<div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
				<div className='flex min-w-0 gap-3'>
					<AlertTriangle
						className='mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400'
						aria-hidden='true'
					/>
					<div>
						<h3
							id={`cancellation-request-${request.id}`}
							className='text-sm font-semibold text-foreground'
						>
							Customer requested cancellation
						</h3>
						<p className='mt-1 text-xs text-muted-foreground'>
							Reason: {request.reasonCode.replaceAll('_', ' ').toLowerCase()}
						</p>
						{request.message && (
							<p className='mt-2 text-sm text-foreground'>{request.message}</p>
						)}
					</div>
				</div>
				<div className='flex shrink-0 gap-2'>
					<Button
						variant='outline'
						size='sm'
						disabled={mutation.isPending}
						onClick={() => mutation.mutate('REJECT')}
					>
						Reject
					</Button>
					<Button
						variant='destructive'
						size='sm'
						disabled={mutation.isPending}
						onClick={() => mutation.mutate('APPROVE')}
					>
						Approve cancellation
					</Button>
				</div>
			</div>
		</section>
	);
}
