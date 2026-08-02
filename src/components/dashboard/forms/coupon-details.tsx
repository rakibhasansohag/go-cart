'use client';

// React
import { FC, useEffect } from 'react';

// Prisma model
import { Coupon } from '@prisma/client';

// Form handling utilities
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Schema
import { CouponFormSchema } from '@/lib/schemas';

// UI Components
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
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useModal } from '@/providers/modal-provider';

// Queries
import { upsertCoupon } from '@/queries/coupon';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

// Hooks & Utils
import { useFormDirtyGuard } from '@/hooks/use-form-dirty-guard';
import { v4 } from 'uuid';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

// Date time picker
import DateTimePicker from 'react-datetime-picker';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';

interface CouponDetailsProps {
	data?: Coupon | null;
	storeUrl: string;
}

const CouponDetails: FC<CouponDetailsProps> = ({ data, storeUrl }) => {
	// Initializing necessary hooks
	const { setClose } = useModal();
	const router = useRouter(); // Hook for routing
	const queryClient = useQueryClient();

	const form = useForm({
		mode: 'onChange',
		resolver: zodResolver(CouponFormSchema),
		defaultValues: {
			// Setting default form values from data (if available)
			code: data?.code || '',
			discount: data?.discount,
			maxUses: data?.maxUses ?? 0,
			maxUsesPerUser: data?.maxUsesPerUser ?? 1,
			startDate: data?.startDate || format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
			endDate: data?.endDate || format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
		},
	});

	const isEditing = Boolean(data?.id);

	const upsertMutation = useMutation({
		mutationFn: (couponData: Parameters<typeof upsertCoupon>[0]) =>
			upsertCoupon(couponData, storeUrl),
		onSuccess: (response) => {
			toast.success(
				data?.id
					? 'Coupon has been updated.'
					: `Congratulations! '${response?.code}' is now created.`,
			);
			resetDirtyState();
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.coupons(storeUrl),
			});
			setClose();
			if (!data?.id) {
				router.push(`/dashboard/seller/stores/${storeUrl}/coupons`);
			}
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : String(error));
		},
	});

	// Loading status based on form submission or mutation pending
	const isLoading = form.formState.isSubmitting || upsertMutation.isPending;

	const { isSaveDisabled, resetDirtyState } = useFormDirtyGuard({
		form,
		isEditing,
		isLoading,
	});

	// Reset form values when data changes
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

	// Submit handler for form submission
	const handleSubmit = async () => {
		const values = form.getValues();
		try {
			await upsertMutation.mutateAsync({
				id: data?.id ? data.id : v4(),
				code: values.code,
				discount: Number(values.discount),
				maxUses: Number(values.maxUses ?? 0),
				maxUsesPerUser: Number(values.maxUsesPerUser ?? 1),
				startDate: values.startDate,
				endDate: values.endDate,
			});
		} catch {
			// Error Toast handled in upsertMutation onError callback
		}
	};

	return (
		<AlertDialog>
			<Card className='w-full'>
				<CardHeader>
					<CardTitle>Coupon Information</CardTitle>
					<CardDescription>
						{data?.id
							? `Update ${data?.code} coupon information.`
							: ' Lets create a coupon. You can edit coupon later from the coupons table or the coupon page.'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								form.handleSubmit(handleSubmit)(e);
							}}
							className='space-y-4'
						>
							<FormField
								disabled={isLoading}
								control={form.control}
								name='code'
								render={({ field }) => (
									<FormItem className='flex-1'>
										<FormLabel>Coupon code</FormLabel>
										<FormControl>
											<Input placeholder='Coupon' {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
								<FormField
									disabled={isLoading}
									control={form.control}
									name='discount'
									render={({ field }) => (
										<FormItem className='flex-1'>
											<FormLabel>Coupon discount (%)</FormLabel>
											<FormControl>
												<Input
													type='number'
													min={1}
													max={99}
													placeholder='%'
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
									disabled={isLoading}
									control={form.control}
									name='maxUses'
									render={({ field }) => (
										<FormItem className='flex-1'>
											<FormLabel>Total Limit (0 = Unlimited)</FormLabel>
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
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									disabled={isLoading}
									control={form.control}
									name='maxUsesPerUser'
									render={({ field }) => (
										<FormItem className='flex-1'>
											<FormLabel>Limit Per Customer</FormLabel>
											<FormControl>
												<Input
													type='number'
													min={0}
													placeholder='1 (Single-use)'
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
							</div>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<FormField
									disabled={isLoading}
									control={form.control}
									name='startDate'
									render={({ field }) => (
										<FormItem className='flex flex-col'>
											<FormLabel>Start date</FormLabel>
											<FormControl>
												<DateTimePicker
													minDate={new Date(new Date().setHours(0, 0, 0, 0))}
													calendarProps={{ showFixedNumberOfWeeks: true }}
													onChange={(date) => {
														field.onChange(
															date ? format(date, "yyyy-MM-dd'T'HH:mm:ss") : '',
														);
													}}
													value={field.value ? new Date(field.value) : null}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									disabled={isLoading}
									control={form.control}
									name='endDate'
									render={({ field }) => (
										<FormItem className='flex flex-col'>
											<FormLabel>End date</FormLabel>
											<FormControl>
												<DateTimePicker
													minDate={
														form.watch('startDate')
															? new Date(form.watch('startDate'))
															: new Date(new Date().setHours(0, 0, 0, 0))
													}
													calendarProps={{ showFixedNumberOfWeeks: true }}
													onChange={(date) => {
														field.onChange(
															date ? format(date, "yyyy-MM-dd'T'HH:mm:ss") : '',
														);
													}}
													value={field.value ? new Date(field.value) : null}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<Button type='submit' disabled={isSaveDisabled}>
								{isLoading
									? 'loading...'
									: data?.id
										? 'Save coupon information'
										: 'Create coupon'}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</AlertDialog>
	);
};

export default CouponDetails;
