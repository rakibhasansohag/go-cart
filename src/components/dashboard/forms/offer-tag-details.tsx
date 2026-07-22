/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// React
import { FC, useEffect } from 'react';

// Prisma model
import { OfferTag } from '@prisma/client';

// Form handling utilities
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Schema
import { OfferTagFormSchema } from '@/lib/schemas';

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

// Queries
import { upsertOfferTag } from '@/queries/offer-tag';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

// Utils
import { v4 } from 'uuid';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface OfferTagDetailsProps {
	data?: OfferTag;
}

const OfferTagDetails: FC<OfferTagDetailsProps> = ({ data }) => {
	// Initializing necessary hooks
	const router = useRouter(); // Hook for routing
	const queryClient = useQueryClient();

	// Form hook for managing form state and validation
	const form = useForm<z.infer<typeof OfferTagFormSchema>>({
		mode: 'onChange', // Form validation mode
		resolver: zodResolver(OfferTagFormSchema), // Resolver for form validation
		defaultValues: {
			// Setting default form values from data (if available)
			name: data?.name,
			url: data?.url,
		},
	});

	const upsertMutation = useMutation({
		mutationFn: upsertOfferTag,
		onSuccess: (response) => {
			toast(
				data?.id
					? 'Offer tag has been updated.'
					: `Congratulations! '${response?.name}' is now created.`,
			);
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.offerTags(),
			});
			if (!data?.id) {
				router.push('/dashboard/admin/offer-tags');
			}
		},
		onError: (error: any) => {
			toast.error('Oops!', {
				description: error.toString(),
			});
		},
	});

	// Loading status based on form submission or mutation pending
	const isLoading = form.formState.isSubmitting || upsertMutation.isPending;

	// Reset form values when data changes
	useEffect(() => {
		if (data) {
			form.reset({
				name: data?.name,
				url: data?.url,
			});
		}
	}, [data, form]);

	// Submit handler for form submission
	const handleSubmit = async () => {
		const values = form.getValues();
		await upsertMutation.mutateAsync({
			id: data?.id ? data.id : v4(),
			name: values.name,
			url: values.url,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	};

	return (
		<AlertDialog>
			<Card className='w-full'>
				<CardHeader>
					<CardTitle>Offer Tag Information</CardTitle>
					<CardDescription>
						{data?.id
							? `Update ${data?.name} offer tag information.`
							: ' Lets create an offer tag. You can edit offer tag later from the offer tags table or the offer tag page.'}
					</CardDescription>
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
								name='name'
								render={({ field }) => (
									<FormItem className='flex-1'>
										<FormLabel>Offer tag name</FormLabel>
										<FormControl>
											<Input placeholder='Name' {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								disabled={isLoading}
								control={form.control}
								name='url'
								render={({ field }) => (
									<FormItem className='flex-1'>
										<FormLabel>Offer tag url</FormLabel>
										<FormControl>
											<Input placeholder='/offer-tag-url' {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button type='submit' disabled={isLoading}>
								{isLoading
									? 'loading...'
									: data?.id
									? 'Save offer tag information'
									: 'Create offer tag'}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</AlertDialog>
	);
};

export default OfferTagDetails;
