'use client';

// React
import { useEffect } from 'react';

// Prisma models
import { Category } from '@prisma/client';
import { CategoryFormSchema } from '@/lib/schemas';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';


// V4
import { v4 } from 'uuid';

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
import ImageUpload from '../shared/image-upload';
import { upsertCategory } from '../../../queries/category';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';


interface CategoryDetailsProps {
	data?: Category;
	cloudinary_key: string;
}

const CategoryDetails = ({ data, cloudinary_key }: CategoryDetailsProps) => {
	const router = useRouter();

	const form = useForm<z.infer<typeof CategoryFormSchema>>({
		mode: 'onChange', // Form validation mode
		resolver: zodResolver(CategoryFormSchema), // Resolver for form validation
		defaultValues: {
			// Setting default form values from data (if available)
			name: data?.name || '',
			image: data?.image ? [{ url: data?.image }] : [],
			url: data?.url || '',
			featured: data?.featured || false,
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
	const handleSubmit = async () => {
		try {
			const values = form.getValues();

			// Upserting Category data
			const response = await upsertCategory({
				id: data?.id ? data.id : v4(),
				name: values?.name.trim(),
				image: values?.image[0].url,
				url: values?.url.trim(),
				featured: values.featured!,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			console.log('Upsert data:', response);

			// displaying success message
			toast.success(
				data?.id
					? 'Category has been updated.'
					: `Congratulations! '${response?.name}' is now created.`,
			);

			// Redirect or Refresh data
			if (data?.id) {
				router.refresh();
			} else {
				router.push('/dashboard/admin/categories');
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			console.error('Full error details:', {
				error,
				formState: form.getValues(),
				formErrors: form.formState.errors,
			});
			toast.error(
				`Operation failed: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			);
		}
	};

	return (
		<>
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
								{/* image upload */}
								<FormField
									control={form.control}
									name='image'
									render={({ field }) => (
										<FormItem>
											<FormControl>
												<ImageUpload
													type='profile'
													value={field.value.map((image) => image.url)}
													disabled={isLoading}
													onChange={(url) => field.onChange([{ url }])}
													onRemove={(url) =>
														field.onChange([
															...field.value.filter(
																(current) => current.url !== url,
															),
														])
													}
													cloudinary_key={cloudinary_key}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
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
		</>
	);
};

export default CategoryDetails;
