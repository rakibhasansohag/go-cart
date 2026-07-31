'use client';

import { Button } from '@/components/ui/button';
import { queryKeys } from '@/lib/query-keys';
import {
	getNotifications,
	markAllNotificationsRead,
	markNotificationRead,
} from '@/queries/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NotificationList() {
	const [page, setPage] = useState(1);
	const [unreadOnly, setUnreadOnly] = useState(false);
	const filters = { page, limit: 10, unreadOnly };
	const queryClient = useQueryClient();
	const router = useRouter();
	const { data, isPending } = useQuery({
		queryKey: queryKeys.notifications.list(filters),
		queryFn: () => getNotifications(filters),
		refetchInterval: 30_000,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		staleTime: 15_000,
	});
	const refresh = () =>
		queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
	const markOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
	const markAll = useMutation({
		mutationFn: markAllNotificationsRead,
		onSuccess: refresh,
	});
	const openNotification = async (
		notificationId: string,
		actionUrl: string | null,
	) => {
		try {
			await markOne.mutateAsync(notificationId);
		} finally {
			router.push(actionUrl || '/notifications');
		}
	};

	return (
		<section aria-labelledby='notification-list-heading' className='space-y-4'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div>
					<h2 id='notification-list-heading' className='text-lg font-semibold'>
						Recent activity
					</h2>
					<p className='text-sm text-muted-foreground' aria-live='polite'>
						{data?.unreadCount ?? 0} unread notifications
					</p>
				</div>
				<div className='flex gap-2'>
					<Button
						variant={unreadOnly ? 'default' : 'outline'}
						onClick={() => {
							setUnreadOnly((value) => !value);
							setPage(1);
						}}
					>
						Unread only
					</Button>
					<Button
						variant='outline'
						onClick={() => markAll.mutate()}
						disabled={!data?.unreadCount || markAll.isPending}
					>
						Mark all read
					</Button>
				</div>
			</div>

			<div className='overflow-hidden rounded-xl border border-border bg-card'>
				{isPending ? (
					<p className='p-8 text-center text-sm text-muted-foreground'>Loading…</p>
				) : data?.notifications.length ? (
					<ul className='divide-y divide-border'>
						{data.notifications.map((notification) => (
							<li key={notification.id}>
								<Link
									href={notification.actionUrl || '/notifications'}
									onClick={(event) => {
										if (!notification.readAt) {
											event.preventDefault();
											void openNotification(
												notification.id,
												notification.actionUrl,
											);
										}
									}}
									className='flex gap-3 p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
								>
									<span
										className={`mt-2 size-2 shrink-0 rounded-full ${
											notification.readAt ? 'bg-muted' : 'bg-primary'
										}`}
									/>
									<div className='min-w-0'>
										<div className='flex flex-wrap items-center gap-2'>
											<h3 className='font-semibold'>{notification.title}</h3>
											<span className='rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground'>
												{notification.category}
											</span>
										</div>
										<p className='mt-1 text-sm text-muted-foreground'>
											{notification.message}
										</p>
										<time className='mt-1 block text-xs text-muted-foreground'>
											{formatDistanceToNow(notification.createdAt, {
												addSuffix: true,
											})}
										</time>
									</div>
								</Link>
							</li>
						))}
					</ul>
				) : (
					<p className='p-10 text-center text-sm text-muted-foreground'>
						No notifications match this filter.
					</p>
				)}
			</div>

			<div className='flex items-center justify-between'>
				<p className='text-xs text-muted-foreground'>
					Page {data?.page ?? page} of {data?.totalPages ?? 1}
				</p>
				<div className='flex gap-2'>
					<Button
						variant='outline'
						disabled={page <= 1}
						onClick={() => setPage((value) => Math.max(1, value - 1))}
					>
						Previous
					</Button>
					<Button
						variant='outline'
						disabled={page >= (data?.totalPages ?? 1)}
						onClick={() => setPage((value) => value + 1)}
					>
						Next
					</Button>
				</div>
			</div>
		</section>
	);
}
