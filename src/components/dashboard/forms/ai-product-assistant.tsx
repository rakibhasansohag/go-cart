'use client';

import { FC, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Loader2, Sparkles, Lightbulb, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Category, SubCategory } from '@prisma/client';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AIProductAssistantProps {
	categories: CategoryWithSubs[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onGenerate: (data: any) => void;
	selectedCategoryId?: string;
	selectedSubCategoryId?: string;
	onCategoryChange: (categoryId: string) => void;
	onSubCategoryChange: (subCategoryId: string) => void;
}

type CategoryWithSubs = Category & {
	subCategories: SubCategory[];
};

const AIProductAssistant: FC<AIProductAssistantProps> = ({
	categories,
	onGenerate,
	selectedCategoryId,
	selectedSubCategoryId,
	onCategoryChange,
	onSubCategoryChange,
}) => {
	const [isGenerating, setIsGenerating] = useState(false);
	const [description, setDescription] = useState('');
	const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

	// Update subcategories when category changes
	useEffect(() => {
		if (selectedCategoryId) {
			const category = categories.find((c) => c.id === selectedCategoryId);
			setSubCategories(category?.subCategories || []);
		} else {
			setSubCategories([]);
		}
	}, [selectedCategoryId, categories]);

	const handleGenerate = async () => {
		// Validation
		if (!selectedCategoryId) {
			toast.error('Please select a category first');
			return;
		}

		if (!selectedSubCategoryId) {
			toast.error('Please select a sub-category first');
			return;
		}

		if (!description.trim()) {
			toast.error('Please enter a product description');
			return;
		}

		if (description.trim().length < 20) {
			toast.error(
				'Please provide a more detailed description (at least 20 characters)',
			);
			return;
		}

		setIsGenerating(true);

		try {
			// Get category and subcategory names
			const category = categories.find((c) => c.id === selectedCategoryId);
			const subCategory = subCategories.find(
				(s) => s.id === selectedSubCategoryId,
			);

			// Call API
			const response = await fetch('/api/generate-product', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					description: description.trim(),
					categoryId: selectedCategoryId,
					subCategoryId: selectedSubCategoryId,
					categoryName: category?.name,
					subCategoryName: subCategory?.name,
				}),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to generate product');
			}

			// Success message pass data to parent with selected categories
			toast.success('✨ Product details generated successfully!', {
				description: 'Review the generated content and make any edits needed.',
			});

			// Add category IDs to generated data
			const enrichedData = {
				...result.data,
				categoryId: selectedCategoryId,
				subCategoryId: selectedSubCategoryId,
			};

			onGenerate(enrichedData);

			// Clear description after successful generation
			setDescription('');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} catch (error: any) {
			console.error('Generation error:', error);
			toast.error('Failed to generate product', {
				description: error.message || 'Please try again',
			});
		} finally {
			setIsGenerating(false);
		}
	};

	const isReadyToGenerate =
		selectedCategoryId &&
		selectedSubCategoryId &&
		description.trim().length >= 20;

	return (
		<Card className='mb-6 border-2 border-dashed border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20'>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<Sparkles className='w-5 h-5 text-blue-500' />
					AI Product Generator
				</CardTitle>
				<CardDescription>
					Select category first, then describe your product to generate all
					details
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-4'>
				{/* Step indicator */}
				<Alert>
					<AlertCircle className='h-4 w-4' />
					<AlertDescription className='text-xs'>
						<strong>Required Steps:</strong>
						<span
							className={
								selectedCategoryId ? 'text-green-600 dark:text-green-400' : ''
							}
						>
							{' '}
							1. Select Category
						</span>{' '}
						→
						<span
							className={
								selectedSubCategoryId
									? 'text-green-600 dark:text-green-400'
									: ''
							}
						>
							{' '}
							2. Select Sub-Category
						</span>{' '}
						→
						<span
							className={
								description.trim().length >= 20
									? 'text-green-600 dark:text-green-400'
									: ''
							}
						>
							{' '}
							3. Describe Product
						</span>
					</AlertDescription>
				</Alert>

				{/* Category Selection */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div className='space-y-2'>
						<Label htmlFor='ai-category'>
							Category <span className='text-red-500'>*</span>
						</Label>
						<Select
							value={selectedCategoryId}
							onValueChange={onCategoryChange}
							disabled={isGenerating}
						>
							<SelectTrigger id='ai-category'>
								<SelectValue placeholder='Select category' />
							</SelectTrigger>
							<SelectContent>
								{categories.map((category) => (
									<SelectItem key={category.id} value={category.id}>
										{category.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='ai-subcategory'>
							Sub-Category <span className='text-red-500'>*</span>
						</Label>
						<Select
							value={selectedSubCategoryId}
							onValueChange={onSubCategoryChange}
							disabled={isGenerating || !selectedCategoryId}
						>
							<SelectTrigger id='ai-subcategory'>
								<SelectValue placeholder='Select sub-category' />
							</SelectTrigger>
							<SelectContent>
								{subCategories.map((sub) => (
									<SelectItem key={sub.id} value={sub.id}>
										{sub.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Product Description Input - Only show if category selected */}
				{selectedCategoryId && selectedSubCategoryId && (
					<div className='space-y-2 animate-in fade-in slide-in-from-top-2 duration-300'>
						<Label htmlFor='ai-description' className='text-base'>
							Describe Your Product <span className='text-red-500'>*</span>
						</Label>
						<Textarea
							id='ai-description'
							placeholder='Example: Handmade ceramic coffee mug with rustic style, eco-friendly materials, perfect for morning coffee. Features earth-tone glazes and comfortable handle design.'
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							disabled={isGenerating}
							rows={4}
							className='resize-none'
						/>
						<div className='flex items-start gap-2 text-xs text-muted-foreground'>
							<Lightbulb className='w-4 h-4 mt-0.5 flex-shrink-0' />
							<p>
								Be specific! Include style, materials, colors, target audience,
								and unique features.
								<span
									className={
										description.trim().length >= 20
											? 'text-green-600 dark:text-green-400 font-medium'
											: 'text-amber-600 dark:text-amber-400'
									}
								>
									{' '}
									({description.trim().length}/20 characters minimum)
								</span>
							</p>
						</div>
					</div>
				)}

				{/* Example Prompts - Only show if categories selected */}
				{selectedCategoryId && selectedSubCategoryId && (
					<div className='p-3 bg-muted/50 rounded-lg space-y-2 animate-in fade-in duration-300'>
						<p className='text-xs font-medium text-muted-foreground'>
							Example prompts:
						</p>
						<div className='space-y-1'>
							<button
								type='button'
								onClick={() =>
									setDescription(
										'Premium leather wallet for men, minimalist design with RFID protection, crafted from genuine Italian leather, slim profile fits in any pocket',
									)
								}
								disabled={isGenerating}
								className='block text-xs text-left text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50'
							>
								• Leather wallet with RFID protection →
							</button>
							<button
								type='button'
								onClick={() =>
									setDescription(
										'Organic cotton t-shirt, sustainable fashion, soft breathable fabric, available in multiple colors, perfect for casual everyday wear',
									)
								}
								disabled={isGenerating}
								className='block text-xs text-left text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50'
							>
								• Organic cotton t-shirt →
							</button>
							<button
								type='button'
								onClick={() =>
									setDescription(
										'Smart fitness watch with heart rate monitor, waterproof design, GPS tracking, 7-day battery life, compatible with iOS and Android',
									)
								}
								disabled={isGenerating}
								className='block text-xs text-left text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50'
							>
								• Smart fitness watch →
							</button>
						</div>
					</div>
				)}

				{/* Generate Button */}
				<Button
					onClick={handleGenerate}
					disabled={!isReadyToGenerate || isGenerating}
					className='w-full'
					size='lg'
				>
					{isGenerating ? (
						<>
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							Generating Magic...
						</>
					) : (
						<>
							<Sparkles className='mr-2 h-4 w-4' />
							Generate Complete Product
						</>
					)}
				</Button>

				{/* Helper text */}
				{!isReadyToGenerate && !isGenerating && (
					<p className='text-xs text-center text-muted-foreground'>
						{!selectedCategoryId
							? '↑ Select a category to begin'
							: !selectedSubCategoryId
							? '↑ Select a sub-category to continue'
							: '↑ Add a detailed product description'}
					</p>
				)}

				{isGenerating && (
					<div className='space-y-2'>
						<p className='text-sm text-center text-muted-foreground animate-pulse'>
							AI is analyzing your description and generating content...
						</p>
						<p className='text-xs text-center text-muted-foreground'>
							This may take 15-20 seconds ⏱️
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default AIProductAssistant;
