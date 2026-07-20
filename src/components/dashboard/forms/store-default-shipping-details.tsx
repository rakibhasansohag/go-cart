/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// React, Next.js
import { FC, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Form handling utilities
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Schema
import { StoreShippingFormSchema } from '@/lib/schemas';

// UI Components
import { AlertDialog } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { NumberInput } from '@tremor/react';
import { Textarea } from '@/components/ui/textarea';

// Queries
import { updateStoreDefaultShippingDetails } from '@/queries/store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

// Types
import { StoreDefaultShippingType } from '@/lib/types';

// Toast
import { toast } from 'sonner';

interface StoreDefaultShippingDetailsProps {
	data?: StoreDefaultShippingType;
	storeUrl: string;
}

const StoreDefaultShippingDetails: FC<StoreDefaultShippingDetailsProps> = ({
	data,
	storeUrl,
}) => {
	// Initializing necessary hooks
	const router = useRouter(); // Hook for routing
	const queryClient = useQueryClient();

	// Form hook for managing form state and validation
	const form = useForm<z.infer<typeof StoreShippingFormSchema>>({
		mode: 'onChange', // Form validation mode
		resolver: zodResolver(StoreShippingFormSchema), // Resolver for form validation
		defaultValues: {
			// Setting default form values from data (if available)
			defaultShippingService: data?.defaultShippingService || '',
			defaultShippingFeePerItem: data?.defaultShippingFeePerItem,
			defaultShippingFeeForAdditionalItem:
				data?.defaultShippingFeeForAdditionalItem,
			defaultShippingFeePerKg: data?.defaultShippingFeePerKg,
			defaultShippingFeeFixed: data?.defaultShippingFeeFixed,
			defaultDeliveryTimeMin: data?.defaultDeliveryTimeMin,
			defaultDeliveryTimeMax: data?.defaultDeliveryTimeMax,
			returnPolicy: data?.returnPolicy,
		},
	});

	const updateMutation = useMutation({
		mutationFn: (values: any) => updateStoreDefaultShippingDetails(storeUrl, values),
		onSuccess: (response) => {
			if (response?.id) {
				toast.success('Store Default shipping details has been updated.');
				queryClient.invalidateQueries({
					queryKey: queryKeys.dashboard.shipping(storeUrl),
				});
			}
		},
		onError: (error: any) => {
			toast.error('Oops!', {
				description: error.toString(),
			});
		},
	});

	// Loading status based on form submission or mutation pending
	const isLoading = form.formState.isSubmitting || updateMutation.isPending;

	// Reset form values when data changes
	useEffect(() => {
		if (data) {
			form.reset(data);
		}
	}, [data, form]);

	// Submit handler for form submission
	const handleSubmit = async () => {
		const values = form.getValues();
		await updateMutation.mutateAsync({
			defaultShippingService: values.defaultShippingService,
			defaultShippingFeePerItem: values.defaultShippingFeePerItem,
			defaultShippingFeeForAdditionalItem:
				values.defaultShippingFeeForAdditionalItem,
			defaultShippingFeePerKg: values.defaultShippingFeePerKg,
			defaultShippingFeeFixed: values.defaultShippingFeeFixed,
			defaultDeliveryTimeMin: values.defaultDeliveryTimeMin,
			defaultDeliveryTimeMax: values.defaultDeliveryTimeMax,
			returnPolicy: values.returnPolicy,
		});
	};

	return (
		<AlertDialog>
			<Card className='w-full'>
				<CardHeader>
					<CardTitle>Store Default Shipping details</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleSubmit)}
							className='space-y-4'
						>
							<FormField
								disabled={isLoading}
								control={form.control}
								name='defaultShippingService'
								render={({ field }) => (
									<FormItem className='flex-1'>
										<FormLabel>Shipping Service name</FormLabel>
										<FormControl>
											<Input placeholder='Name' {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className='flex flex-wrap gap-4'>
								<FormField
									disabled={isLoading}
									control={form.control}
									name='defaultShippingFeePerItem'
									render={({ field }) => (
										<FormItem className='flex-1'>
											<FormLabel>Shipping fee per item</FormLabel>
											<FormControl>
												<NumberInput
													defaultValue={field?.value}
													onValueChange={field.onChange}
													min={0}
													step={0.1}
													className='!pl-2 !shadow-none rounded-md'
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									disabled={isLoading}
									control={form.control}
									name='defaultShippingFeeForAdditionalItem'
									render={({ field }) => (
										<FormItem className='flex-1'>
											<FormLabel>Shipping fee for additional item</FormLabel>
											<FormControl>
												<NumberInput
													defaultValue={field.value}
													onValueChange={field.onChange}
													min={0}
													step={0.1}
													className='!pl-2 !shadow-none rounded-md'
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<div className='flex flex-wrap gap-4'>
								<FormField
									disabled={isLoading}
									control={form.control}
									name='defaultShippingFeePerKg'
									render={({ field }) => (
										<FormItem className='flex-1'>
											<FormLabel>Shipping fee per kg</FormLabel>
											<FormControl>
												<NumberInput
													defaultValue={field.value}
													onValueChange={field.onChange}
													min={0}
													step={0.1}
													className='!pl-2 !shadow-none rounded-md'
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									disabled={isLoading}
									control={form.control}
									name='defaultShippingFeeFixed'
									render={({ field }) => (
										<FormItem className='flex-1'>
											<FormLabel>Fixed Shippig fee</FormLabel>
											<FormControl>
												<NumberInput
													defaultValue={field.value}
													onValueChange={field.onChange}
													min={0}
													step={0.1}
													className='!pl-2 !shadow-none rounded-md'
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<div className='flex flex-wrap gap-4'>
								<FormField
									disabled={isLoading}
									control={form.control}
									name='defaultDeliveryTimeMin'
									render={({ field }) => (
										<FormItem className='flex-1'>
											<FormLabel>Minimum Delivery time (days)</FormLabel>
											<FormControl>
												<NumberInput
													defaultValue={field.value}
													onValueChange={field.onChange}
													min={1}
													className='!shadow-none rounded-md pl-2'
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									disabled={isLoading}
									control={form.control}
									name='defaultDeliveryTimeMax'
									render={({ field }) => (
										<FormItem className='flex-1'>
											<FormLabel>Maximum Delivery time (days)</FormLabel>

											<FormControl>
												<NumberInput
													defaultValue={field.value}
													onValueChange={field.onChange}
													min={1}
													className='!shadow-none rounded-md pl-2'
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<FormField
								disabled={isLoading}
								control={form.control}
								name='returnPolicy'
								render={({ field }) => (
									<FormItem className='flex-1'>
										<FormLabel>Return policy</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="What's the return policy for your store ?"
												className='p-4'
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type='submit' disabled={isLoading}>
								{isLoading ? 'loading...' : 'Save changes'}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</AlertDialog>
	);
};

export default StoreDefaultShippingDetails;
