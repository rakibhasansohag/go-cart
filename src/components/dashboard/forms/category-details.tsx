'use client';

// React
import { useEffect } from 'react';

// Prisma models
import { Category } from '@prisma/client';
import { CategoryFormSchema } from '@/lib/schemas';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';

// UI Components
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { AlertDialog } from '@/components/ui/alert-dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface CategoryDetailsProps {
	data?: Category;
}

const CategoryDetails = ({ data }: CategoryDetailsProps) => {
	const form = useForm<z.infer<typeof CategoryFormSchema>>({
		mode: 'onChange', // Form validation mode
		resolver: zodResolver(CategoryFormSchema), // Resolver for form validation
		defaultValues: {
			// Setting default form values from data (if available)
			name: data?.name,
			image: data?.image ? [{ url: data?.image }] : [],
			url: data?.url,
			featured: data?.featured,
		},
	});

	// Loading status based on form submission
	const isLoading = form.formState.isSubmitting;

	// Rest form values on form submission
	useEffect(() => {
		if (data) {
			form.reset({
				name: data?.name,
				image: [{ url: data?.image }],
				url: data?.url,
				featured: data?.featured,
			});
		}
	}, [data, form]);

	// Submit handler for form submission
	const handleSubmit = async (values: z.infer<typeof CategoryDetails>) => {
		console.log(values);
	};

	return (
		<AlertDialog>
			<Card>
				<CardHeader>
					<CardTitle>Category Information</CardTitle>
					<CardDescription>
						{data?.id
							? `Update ${data?.name} category information.`
							: ' Lets create a category. You can edit category later from the categories table or the category page.'}
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
										<FormLabel>Category name</FormLabel>
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
										<FormLabel>Category url</FormLabel>
										<FormControl>
											<Input placeholder='/category-url' {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='featured'
								render={({ field }) => (
									<FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
										<div className='space-y-1 leading-none'>
											<FormLabel>Featured</FormLabel>
											<FormDescription>
												This Category will appear on the home page
											</FormDescription>
										</div>
									</FormItem>
								)}
							/>
							<Button type='submit' disabled={isLoading}>
								{isLoading
									? 'loading...'
									: data?.id
									? 'Save category information'
									: 'Create category'}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</AlertDialog>
	);
};

export default CategoryDetails;
