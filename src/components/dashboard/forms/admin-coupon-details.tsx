'use client';

import { FC, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CouponFormSchema } from '@/lib/schemas';
import { AlertDialog } from '@/components/ui/alert-dialog';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useModal } from '@/providers/modal-provider';
import { upsertAdminCoupon } from '@/queries/coupon';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { v4 } from 'uuid';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import DateTimePicker from 'react-datetime-picker';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';

interface AdminCouponDetailsProps {
	data?: {
		id: string;
		code: string;
		discount: number;
		maxUses: number;
		maxUsesPerUser?: number;
		startDate: string;
		endDate: string;
		storeId?: string | null;
	} | null;
}

export const AdminCouponDetails: FC<AdminCouponDetailsProps> = ({ data }) => {
	const { setClose } = useModal();
	const queryClient = useQueryClient();
	const router = useRouter();

	const form = useForm({
		mode: 'onChange',
		resolver: zodResolver(CouponFormSchema),
		defaultValues: {
			code: data?.code || '',
			discount: data?.discount ?? 10,
			maxUses: data?.maxUses ?? 0,
			maxUsesPerUser: data?.maxUsesPerUser ?? 1,
			startDate: data?.startDate || format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
			endDate: data?.endDate || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm:ss"),
		},
	});

	const isEditing = Boolean(data?.id);

	const upsertMutation = useMutation({
		mutationFn: (couponData: any) => upsertAdminCoupon(couponData),
		onSuccess: (response) => {
			toast.success(
				data?.id
					? 'Platform coupon updated successfully.'
					: `Global Coupon '${response?.code}' created successfully!`,
			);
			queryClient.invalidateQueries({
				queryKey: ['dashboard', 'adminCoupons'],
			});
			router.refresh();
			setClose();
		},
		onError: (error: any) => {
			toast.error(error.message || 'Failed to save coupon.');
		},
	});

	useEffect(() => {
		if (data) {
			form.reset({
				code: data.code,
				discount: data.discount,
				maxUses: data.maxUses,
				maxUsesPerUser: data.maxUsesPerUser ?? 1,
				startDate: data.startDate,
				endDate: data.endDate,
			});
		}
	}, [data, form]);

	const handleSubmit = async () => {
		const values = form.getValues();
		try {
			await upsertMutation.mutateAsync({
				id: data?.id ? data.id : v4(),
				code: values.code,
				discount: values.discount,
				maxUses: values.maxUses ?? 0,
				maxUsesPerUser: values.maxUsesPerUser ?? 1,
				startDate: values.startDate,
				endDate: values.endDate,
				storeId: data?.storeId || null,
			});
		} catch {
			/* toast handles error */
		}
	};

	return (
		<AlertDialog>
			<Card className='w-full border-none shadow-none'>
				<CardHeader className='px-0 pt-0'>
					<CardTitle className='text-xl font-bold'>
						{isEditing ? 'Edit Global Coupon' : 'Create Global Platform Coupon'}
					</CardTitle>
					<CardDescription>
						Global Platform Coupons apply across all stores site-wide for welcome promos and campaign sales.
					</CardDescription>
				</CardHeader>
				<CardContent className='px-0 pb-0'>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
							<FormField
								control={form.control}
								name='code'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Coupon Code</FormLabel>
										<FormControl>
											<Input
												placeholder='e.g. WELCOME87 or RAKIB'
												{...field}
												className='uppercase tracking-wider font-semibold'
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
								<FormField
									control={form.control}
									name='discount'
									render={({ field }) => (
										<FormItem>
											<FormLabel>Discount (%)</FormLabel>
											<FormControl>
												<Input
													type='number'
													min={1}
													max={99}
													placeholder='87'
													value={typeof field.value === 'number' || typeof field.value === 'string' ? field.value : ''}
													onChange={(e) => {
														const val = e.target.value;
														field.onChange(val === '' ? '' : Number(val));
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name='maxUses'
									render={({ field }) => (
										<FormItem>
											<FormLabel>Total Stock Limit</FormLabel>
											<FormControl>
												<Input
													type='number'
													min={0}
													placeholder='0 (Unlimited)'
													value={typeof field.value === 'number' || typeof field.value === 'string' ? field.value : ''}
													onChange={(e) => {
														const val = e.target.value;
														field.onChange(val === '' ? '' : Number(val));
													}}
												/>
											</FormControl>
											<FormDescription className='text-[11px]'>0 = unlimited total uses</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name='maxUsesPerUser'
									render={({ field }) => (
										<FormItem>
											<FormLabel>Limit Per Customer</FormLabel>
											<FormControl>
												<Input
													type='number'
													min={0}
													placeholder='1'
													value={typeof field.value === 'number' || typeof field.value === 'string' ? field.value : ''}
													onChange={(e) => {
														const val = e.target.value;
														field.onChange(val === '' ? '' : Number(val));
													}}
												/>
											</FormControl>
											<FormDescription className='text-[11px]'>1 = single-use per customer</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2'>
								<FormField
									control={form.control}
									name='startDate'
									render={({ field }) => (
										<FormItem className='flex flex-col'>
											<FormLabel>Start Date</FormLabel>
											<FormControl>
												<DateTimePicker
													onChange={(date) => {
														if (date instanceof Date) {
															field.onChange(format(date, "yyyy-MM-dd'T'HH:mm:ss"));
														}
													}}
													value={field.value ? new Date(field.value) : new Date()}
													className='w-full rounded-md border border-input p-2 text-sm bg-background'
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name='endDate'
									render={({ field }) => (
										<FormItem className='flex flex-col'>
											<FormLabel>End Date</FormLabel>
											<FormControl>
												<DateTimePicker
													onChange={(date) => {
														if (date instanceof Date) {
															field.onChange(format(date, "yyyy-MM-dd'T'HH:mm:ss"));
														}
													}}
													value={field.value ? new Date(field.value) : new Date()}
													className='w-full rounded-md border border-input p-2 text-sm bg-background'
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className='flex justify-end gap-3 pt-4'>
								<Button type='button' variant='outline' onClick={() => setClose()}>
									Cancel
								</Button>
								<Button type='submit' disabled={upsertMutation.isPending}>
									{upsertMutation.isPending ? 'Saving...' : isEditing ? 'Update Coupon' : 'Create Global Coupon'}
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</AlertDialog>
	);
};

export default AdminCouponDetails;
