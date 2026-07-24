/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// React, Next.js
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Prisma model
import {
	Country,
	OfferTag,
	ShippingFeeMethod,
	SubCategory,
} from '@prisma/client';

// Form handling utilities
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Schema
import { ProductFormSchema } from '@/lib/schemas';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ImageUpload from '../shared/image-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelect } from 'react-multi-select-component';
import { Skeleton } from '@/components/ui/skeleton';

// Queries
import { upsertProduct } from '@/queries/product';
import {
	CategoryWithSubs,
	getAllCategoriesForCategory,
} from '@/queries/category';

// ReactTags
import { WithOutContext as ReactTags } from 'react-tag-input';

// Utils
import { v4 } from 'uuid';

// Types
import { ProductWithVariantType } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

import ClickToAddInputs from './click-to-add';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

// React date time picker
import DateTimePicker from 'react-datetime-picker';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';
import { format } from 'date-fns';

// Jodit text editor
import JoditEditor from 'jodit-react';
import type { IJodit } from 'jodit/esm/types/jodit';
import { NumberInput } from '@tremor/react';
import InputFieldset from '../shared/input-fieldset';
import { ArrowRight, Dot, Loader2, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import ImagesPreviewGrid from '../shared/images-preview-grid';
import { toast } from 'sonner';

// AI Product Assistant
import AIProductAssistant from './ai-product-assistant';
import AIToggle from '../../ai-toggle';
import ImagePromptSection from '../../image-prompt-section';
import { cn } from '@/lib/utils';
import { useModal } from '@/providers/modal-provider';
// import { getAllCategoriesForCategory } from '@/queries/category';

const shippingFeeMethods = [
	{
		value: ShippingFeeMethod.ITEM,
		description: 'ITEM (Fees calculated based on number of products.)',
	},
	{
		value: ShippingFeeMethod.WEIGHT,
		description: 'WEIGHT (Fees calculated based on product weight)',
	},
	{
		value: ShippingFeeMethod.FIXED,
		description: 'FIXED (Fees are fixed.)',
	},
];

interface ProductDetailsProps {
	data?: Partial<ProductWithVariantType>;
	categories: CategoryWithSubs[];
	offerTags: OfferTag[];
	storeUrl: string;
	countries: Country[];
	isDataLoading?: boolean;
}

const ProductDetailsFormSkeleton = () => {
	return (
		<div className='space-y-6 p-4 animate-pulse'>
			<div className='flex items-center justify-between border-b pb-4'>
				<Skeleton className='h-8 w-48 rounded-md' />
				<Skeleton className='h-9 w-32 rounded-full' />
			</div>

			<div className='space-y-4'>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div className='space-y-2'>
						<Skeleton className='h-4 w-24' />
						<Skeleton className='h-10 w-full rounded-md' />
					</div>
					<div className='space-y-2'>
						<Skeleton className='h-4 w-24' />
						<Skeleton className='h-10 w-full rounded-md' />
					</div>
				</div>

				<div className='space-y-2 pt-2'>
					<Skeleton className='h-4 w-32' />
					<Skeleton className='h-64 w-full rounded-md' />
				</div>

				<div className='grid grid-cols-1 md:grid-cols-3 gap-4 pt-4'>
					<div className='space-y-2'>
						<Skeleton className='h-4 w-20' />
						<Skeleton className='h-10 w-full rounded-md' />
					</div>
					<div className='space-y-2'>
						<Skeleton className='h-4 w-28' />
						<Skeleton className='h-10 w-full rounded-md' />
					</div>
					<div className='space-y-2'>
						<Skeleton className='h-4 w-20' />
						<Skeleton className='h-10 w-full rounded-md' />
					</div>
				</div>

				<div className='space-y-2 pt-4'>
					<Skeleton className='h-4 w-28' />
					<Skeleton className='h-40 w-full rounded-md' />
				</div>

				<div className='flex justify-end gap-3 pt-6'>
					<Skeleton className='h-10 w-24 rounded-md' />
					<Skeleton className='h-10 w-36 rounded-md' />
				</div>
			</div>
		</div>
	);
};

const ProductDetails: FC<ProductDetailsProps> = ({
	data,
	categories,
	offerTags,
	storeUrl,
	countries,
	isDataLoading = false,
}) => {
	// Initializing necessary hooks
	const router = useRouter(); // Hook for routing
	const queryClient = useQueryClient();

	// Is new variant page
	const isNewVariantPage = data?.productId && !data?.variantId;

	// Jodit editor refs
	const productDescEditor = useRef<IJodit | null>(null);
	const variantDescEditor = useRef<IJodit | null>(null);

	// TODO : Handle AI generated data and showed which fileds are generated by ai
	// AI Product Assistant
	const [isAiGenerated, setIsAIGenerated] = useState(false);
	const [aiCategoryId, setAiCategoryId] = useState('');
	const [aiSubCategoryId, setAiSubCategoryId] = useState('');
	const [imagePrompt, setImagePrompt] = useState('');
	const [generatedImageUrls, setGeneratedImageUrls] = useState<string[]>([]);

	// AI toggle state
	const [aiPanelOpen, setAiPanelOpen] = useState(false);

	// Jodit configuration
	const { theme, resolvedTheme } = useTheme();
	const currentTheme = resolvedTheme || theme;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const config: any = useMemo(
		() => ({
			theme: currentTheme === 'dark' ? 'dark' : 'default',
			askBeforePasteHTML: false,
			askBeforePasteFromWord: false,
			defaultActionOnPaste: 'insert_clear_html' as const,
			showPlaceholder: false,
			height: 300,
			// Force Jodit popup containers to attach to document.body instead of
			// the nearest position:fixed ancestor (Radix Dialog), which would
			// cause transform-offset miscalculation and misaligned dropdowns.
			popupRoot: typeof document !== 'undefined' ? document.body : null,
		}),
		[currentTheme],
	);

	// State for subCategories
	const [subCategories, setSubCategories] = useState<SubCategory[]>([]);

	// State for colors
	const [colors, setColors] = useState<{ color: string }[]>(
		data?.colors || [{ color: '' }],
	);

	// keep local images state (array of { url })
	const [images, setImages] = useState<{ url: string }[]>(data?.images ?? []);

	// sync initial form values with local images on mount / when `data` changes
	useEffect(() => {
		const initial = form.getValues().images ?? [];
		setImages(Array.isArray(initial) ? initial : []);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]); // only when data changes

	// helper handlers to add/remove images (no field.onChange here)
	const handleAddImage = (url: string) => {
		setImages((prev) => {
			const next = [...prev, { url }];
			console.log('[handleAddImage] new length', next.length, next);
			return next;
		});
	};

	const handleRemoveImage = (url: string) => {
		setImages((prev) => {
			const next = prev.filter((i) => i.url !== url);
			console.log('[handleRemoveImage] new length', next.length, next);
			return next;
		});
	};

	// State for sizes
	const [sizes, setSizes] = useState<
		{ size: string; price: number; quantity: number; discount: number }[]
	>(data?.sizes || [{ size: '', quantity: 1, price: 0.01, discount: 0 }]);

	// State for product specs
	const [productSpecs, setProductSpecs] = useState<
		{ name: string; value: string }[]
	>(data?.product_specs || [{ name: '', value: '' }]);

	// State for product variant specs
	const [variantSpecs, setVariantSpecs] = useState<
		{ name: string; value: string }[]
	>(data?.variant_specs || [{ name: '', value: '' }]);

	// State for product variant specs
	const [questions, setQuestions] = useState<
		{ question: string; answer: string }[]
	>(data?.questions || [{ question: '', answer: '' }]);

	// Form hook for managing form state and validation
	const form = useForm<z.infer<typeof ProductFormSchema>>({
		mode: 'onChange', // Form validation mode
		resolver: zodResolver(ProductFormSchema as any), // Resolver for form validation
		defaultValues: {
			// Setting default form values from data (if available)
			name: data?.name || '',
			description: data?.description,
			variantName: data?.variantName || '',
			variantDescription: data?.variantDescription,
			images: data?.images || [],
			variantImage: data?.variantImage ? [{ url: data.variantImage }] : [],
			categoryId: data?.categoryId,
			subCategoryId: data?.subCategoryId,

			offerTagId: data?.offerTagId ?? '',

			brand: data?.brand || '',
			sku: data?.sku || '',
			weight: data?.weight || 0.1,
			colors: data?.colors || [{ color: '' }],
			sizes: data?.sizes || [
				{ size: '', price: 0.01, quantity: 1, discount: 0 },
			],
			product_specs: data?.product_specs || [{ name: '', value: '' }],
			variant_specs: data?.variant_specs || [{ name: '', value: '' }],
			keywords: data?.keywords || [],
			questions: data?.questions || [{ question: '', answer: '' }],
			isSale: data?.isSale ?? false,
			saleEndDate: data?.saleEndDate || new Date().toISOString(),
			freeShippingForAllCountries: data?.freeShippingForAllCountries ?? false,
			freeShippingCountriesIds:
				data?.freeShippingCountriesIds?.map((id) => id) || [],
			shippingFeeMethod: data?.shippingFeeMethod,
		},
	});

	// WHEN images change, update the RHF form value (runs outside render)
	useEffect(() => {
		form.setValue('images', images, {
			shouldTouch: true,
			shouldValidate: true,
		});

		console.log('[images -> form] images length =', images.length, images);
	}, [images, form]);

	const saleEndDate = form.getValues().saleEndDate || new Date().toISOString();

	const formattedDate = new Date(saleEndDate).toLocaleString('en-Us', {
		weekday: 'short', // Abbreviated day name (e.g., "Mon")
		month: 'long', // Abbreviated month name (e.g., "Nov")
		day: '2-digit', // Two-digit day (e.g., "25")
		year: 'numeric', // Full year (e.g., "2024")
		hour: '2-digit', // Two-digit hour (e.g., "02")
		minute: '2-digit', // Two-digit minute (e.g., "30")
		second: '2-digit', // Two-digit second (optional)
		hour12: false, // 12-hour format (change to false for 24-hour format)
	});

	const { setClose, setIsDirty } = useModal();

	const selectedCategoryId = form.watch('categoryId');

	// Watch specific primitive fields to prevent re-render memory leak
	const watchName = form.watch('name');
	const watchDesc = form.watch('description');
	const watchVariantName = form.watch('variantName');
	const watchBrand = form.watch('brand');
	const isFormDirtyRHF = form.formState.isDirty;
	const imagesLength = images?.length || 0;

	useEffect(() => {
		const dirty =
			isFormDirtyRHF ||
			Boolean(watchName?.trim()) ||
			Boolean(watchDesc?.trim()) ||
			Boolean(watchVariantName?.trim()) ||
			Boolean(watchBrand?.trim()) ||
			imagesLength > 0;

		setIsDirty(dirty);
	}, [
		watchName,
		watchDesc,
		watchVariantName,
		watchBrand,
		isFormDirtyRHF,
		imagesLength,
		setIsDirty,
	]);

	// UseEffect to get subCategories when user pick/change a category
	useEffect(() => {
		if (!selectedCategoryId) {
			setSubCategories([]);
			return;
		}

		const categoryObj = categories?.find((c) => c.id === selectedCategoryId);
		if (categoryObj && categoryObj.subCategories && categoryObj.subCategories.length > 0) {
			setSubCategories(categoryObj.subCategories);
			return;
		}

		const getSubCategories = async () => {
			const res = await getAllCategoriesForCategory(selectedCategoryId);
			setSubCategories(res || []);
		};
		getSubCategories();
	}, [selectedCategoryId, categories]);

	// Extract errors state from form
	const errors = form.formState.errors;

	// Loading status based on form submission
	const isLoading = form.formState.isSubmitting;

	// DateTimePicker input wrap handling (12 -> 1, 1 -> 12, 59 -> 00, 00 -> 59)
	const dateTimePickerRef = useRef<HTMLDivElement>(null);

	const isSaleValue = form.watch('isSale');
	useEffect(() => {
		const container = dateTimePickerRef.current;
		if (!container) return;

		const handleWheel = (e: WheelEvent) => {
			const target = e.target as HTMLInputElement;
			if (!target || !target.classList.contains('react-datetime-picker__inputGroup__input')) return;

			const name = target.name || '';
			const val = parseInt(target.value, 10);
			if (isNaN(val)) return;

			const isUp = e.deltaY < 0;

			if (name.includes('hour')) {
				const max = target.max ? parseInt(target.max, 10) : 12;
				const min = target.min ? parseInt(target.min, 10) : 1;

				if (isUp && val >= max) {
					e.preventDefault();
					e.stopPropagation();
					target.value = String(min);
					target.dispatchEvent(new Event('input', { bubbles: true }));
					target.dispatchEvent(new Event('change', { bubbles: true }));
				} else if (!isUp && val <= min) {
					e.preventDefault();
					e.stopPropagation();
					target.value = String(max);
					target.dispatchEvent(new Event('input', { bubbles: true }));
					target.dispatchEvent(new Event('change', { bubbles: true }));
				}
			} else if (name.includes('minute') || name.includes('second')) {
				const max = 59;
				const min = 0;

				if (isUp && val >= max) {
					e.preventDefault();
					e.stopPropagation();
					target.value = '00';
					target.dispatchEvent(new Event('input', { bubbles: true }));
					target.dispatchEvent(new Event('change', { bubbles: true }));
				} else if (!isUp && val <= min) {
					e.preventDefault();
					e.stopPropagation();
					target.value = '59';
					target.dispatchEvent(new Event('input', { bubbles: true }));
					target.dispatchEvent(new Event('change', { bubbles: true }));
				}
			}
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLInputElement;
			if (!target || !target.classList.contains('react-datetime-picker__inputGroup__input')) return;

			if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

			const name = target.name || '';
			const val = parseInt(target.value, 10);
			if (isNaN(val)) return;

			const isUp = e.key === 'ArrowUp';

			if (name.includes('hour')) {
				const max = target.max ? parseInt(target.max, 10) : 12;
				const min = target.min ? parseInt(target.min, 10) : 1;

				if (isUp && val >= max) {
					e.preventDefault();
					e.stopPropagation();
					target.value = String(min);
					target.dispatchEvent(new Event('input', { bubbles: true }));
					target.dispatchEvent(new Event('change', { bubbles: true }));
				} else if (!isUp && val <= min) {
					e.preventDefault();
					e.stopPropagation();
					target.value = String(max);
					target.dispatchEvent(new Event('input', { bubbles: true }));
					target.dispatchEvent(new Event('change', { bubbles: true }));
				}
			} else if (name.includes('minute') || name.includes('second')) {
				const max = 59;
				const min = 0;

				if (isUp && val >= max) {
					e.preventDefault();
					e.stopPropagation();
					target.value = '00';
					target.dispatchEvent(new Event('input', { bubbles: true }));
					target.dispatchEvent(new Event('change', { bubbles: true }));
				} else if (!isUp && val <= min) {
					e.preventDefault();
					e.stopPropagation();
					target.value = '59';
					target.dispatchEvent(new Event('input', { bubbles: true }));
					target.dispatchEvent(new Event('change', { bubbles: true }));
				}
			}
		};

		container.addEventListener('wheel', handleWheel, { passive: false });
		container.addEventListener('keydown', handleKeyDown, { capture: true });

		return () => {
			container.removeEventListener('wheel', handleWheel);
			container.removeEventListener('keydown', handleKeyDown, { capture: true });
		};
	}, [isSaleValue]);

	if (isDataLoading) {
		return <ProductDetailsFormSkeleton />;
	}

	// Reset form values when data changes
	useEffect(() => {
		if (data) {
			form.reset({
				...data,
				variantImage: data.variantImage ? [{ url: data.variantImage }] : [],
			});
		}
	}, [data, form]);

	// Submit handler for form submission
	const handleSubmit = async () => {
		console.log('click');
		try {
			console.log(
				'handleSubmit started — formState.isSubmitting:',
				form.formState.isSubmitting,
			);
			console.log('Current form errors:', form.formState.errors);
			const values = form.getValues();
			console.log(values);

			// helper: find first URL/data:image string anywhere inside an object (BFS)
			const findUrlInObject = (obj: any): string | null => {
				if (!obj) return null;
				if (typeof obj === 'string') {
					return /^data:image\/|^https?:\/\//.test(obj) ? obj : null;
				}
				if (obj instanceof File) return null; // File must be uploaded first

				const queue = [obj];
				const seen = new WeakSet();

				while (queue.length) {
					const cur = queue.shift();
					if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
					seen.add(cur);

					for (const key of Object.keys(cur)) {
						const val = cur[key];
						if (
							typeof val === 'string' &&
							/^data:image\/|^https?:\/\//.test(val)
						) {
							return val;
						}
						// handle arrays too
						if (Array.isArray(val)) {
							for (const v of val) {
								if (
									typeof v === 'string' &&
									/^data:image\/|^https?:\/\//.test(v)
								)
									return v;
								if (typeof v === 'object' && v !== null) queue.push(v);
							}
						} else if (typeof val === 'object' && val !== null) {
							queue.push(val);
						}
					}
				}

				return null;
			};

			const normalizeImages = (images: any[] | undefined): string[] => {
				return (images || [])
					.map((img) => findUrlInObject(img))
					.filter(Boolean) as string[];
			};

			// debug / usage of findUrlInObject
			const normalizedImages = normalizeImages(values.images);
			console.log(
				'images keys summary:',
				(values.images || []).map((img: any, i: number) => ({
					index: i,
					keys: Object.keys(img || {}),
					foundUrl: findUrlInObject(img) || null,
				})),
			);

			// guard: use normalizedImages instead of raw values.images
			if (normalizedImages.length === 0 && (values.images || []).length > 0) {
				console.error(
					'Invalid images found (no usable URL discovered):',
					values.images,
				);
				toast.error(
					'Images contain invalid data. Please use generated images from Puter or fallback only.',
				);
				return;
			}

			// normalized images (urls)
			console.log('normalized images (urls):', normalizedImages);

			const validImages = normalizedImages.filter((u) =>
				/^data:image\/|^https?:\/\//.test(u),
			);

			// only fail if we have images but none are valid URLs/data:
			if (validImages.length === 0 && (normalizedImages || []).length > 0) {
				console.error('Invalid images found:', values.images);
				toast.error(
					'Images contain invalid data. Please use generated images from Puter or fallback only.',
				);
				return;
			}

			// ====== IMPORTANT: convert string[] -> { id?: string; url: string }[] ======
			const imagesAsObjects: { id?: string; url: string }[] = validImages.map(
				(u) => ({ url: u }),
			);
			// =======================================================================

			// Upserting product data — pass imagesAsObjects instead
			const response = await upsertProduct(
				{
					productId: data?.productId ? data.productId : v4(),
					variantId: data?.variantId ? data.variantId : v4(),
					name: values.name,
					description: values.description,
					variantName: values.variantName || '',
					variantDescription: values.variantDescription || '',
					images: imagesAsObjects,
					variantImage: values.variantImage[0].url,
					categoryId: values.categoryId,
					subCategoryId: values.subCategoryId,

					offerTagId: values.offerTagId?.trim() ? values.offerTagId : undefined,

					isSale: values.isSale!,
					saleEndDate: values.saleEndDate,
					brand: values.brand,
					sku: values.sku,
					weight: values.weight,
					colors: values.colors,
					sizes: values.sizes,
					product_specs: values.product_specs,
					variant_specs: values.variant_specs,
					keywords: values.keywords,
					questions: values.questions,
					shippingFeeMethod: values.shippingFeeMethod,
					freeShippingForAllCountries: values.freeShippingForAllCountries!,
					freeShippingCountriesIds: values.freeShippingCountriesIds || [],
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				storeUrl,
			);

			console.log(response);

			// Displaying success message
			toast.success(
				data?.productId && data?.variantId
					? 'Product has been updated.'
					: `Congratulations! product ${values.name} is now created.`,
			);

			// Invalidate query cache for store products
			queryClient.invalidateQueries({
				queryKey: queryKeys.dashboard.products(storeUrl),
			});

			// Reset dirty state and force close modal if open
			setIsDirty(false);
			setClose(true);

			// Redirect to products list page
			router.push(`/dashboard/seller/stores/${storeUrl}/products`);
			router.refresh();
		} catch (error: any) {
			// Handling form submission errors
			toast.error(error.toString());
			console.error('[handleSubmit] error ->', error);
		}
	};

	// Handle Ai Generated content

	const handleAIGenerate = async (generatedData: any) => {
		setIsAIGenerated(true);
		// set categories
		if (generatedData.categoryId) {
			form.setValue('categoryId', generatedData.categoryId);
			const subs = await getAllCategoriesForCategory(generatedData.categoryId);
			setSubCategories(subs);
		}
		if (generatedData.subCategoryId) {
			form.setValue('subCategoryId', generatedData.subCategoryId);
		}

		// product fields
		form.setValue('name', generatedData.name);
		form.setValue('description', generatedData.description);
		form.setValue('brand', generatedData.brand);
		form.setValue('variantName', generatedData.variantName || '');
		form.setValue('variantDescription', generatedData.variantDescription || '');
		form.setValue('sku', generatedData.sku);
		form.setValue('weight', generatedData.weight);

		// arrays
		setColors(generatedData.colors || []);
		setSizes(generatedData.sizes || []);
		setProductSpecs(generatedData.product_specs || []);
		setVariantSpecs(generatedData.variant_specs || []);
		setKeywords(generatedData.keywords || []);
		setQuestions(generatedData.questions || []);

		// build default image prompt
		const promptParts = [
			generatedData.name,
			generatedData.variantName || '',
			(generatedData.colors || []).map((c: any) => c.color).join(', '),
			generatedData.brand,
			'High resolution product photography, white background, 45° angle, studio lighting, realistic texture',
		].filter(Boolean);
		const builtPrompt = promptParts.join(' — ');
		setImagePrompt(builtPrompt);

		// Optionally close the AI panel
		setAiPanelOpen(false);

		// scroll to form for review
		setTimeout(() => {
			window.scrollTo({ top: 300, behavior: 'smooth' });
		}, 300);

		toast.success(
			' AI Generated Complete Product! You can now generate images.',
		);
	};

	// Handlers for category changes in AI assistant
	const handleAICategoryChange = async (categoryId: string) => {
		setAiCategoryId(categoryId);
		setAiSubCategoryId(''); // Reset subcategory when category changes
	};

	const handleAISubCategoryChange = (subCategoryId: string) => {
		setAiSubCategoryId(subCategoryId);
	};

	// Handler called when ImagePromptSection returns images to add to product
	const handleAddImagesToProduct = (urls: string[]) => {
		const mapped = urls.map((u) => ({ url: u }));
		setImages((prev) => [...mapped, ...prev]);
		setGeneratedImageUrls(urls);
	};

	// ERROR :  GOT SOME PROBLEM in here
	// Handle keywords input
	const [keywords, setKeywords] = useState<string[]>(data?.keywords || []);

	interface Keyword {
		id: string;
		text: string;
	}

	const handleAddition = (keyword: Keyword) => {
		if (keywords.length === 10) return;
		setKeywords([...keywords, keyword.text]);
	};

	const handleDeleteKeyword = (i: number) => {
		setKeywords(keywords.filter((_, index) => index !== i));
	};

	// Whenever colors, sizes, keywords changes we update the form values
	useEffect(() => {
		form.setValue('colors', colors);
		form.setValue('sizes', sizes);
		form.setValue('keywords', keywords);
		form.setValue('product_specs', productSpecs);
		form.setValue('variant_specs', variantSpecs);
		form.setValue('questions', questions);
	}, [
		colors,
		sizes,
		keywords,
		productSpecs,
		questions,
		variantSpecs,
		data,
		form,
	]);

	//Countries options
	type CountryOption = {
		label: string;
		value: string;
	};

	const countryOptions: CountryOption[] = countries.map((c) => ({
		label: c.name,
		value: c.id,
	}));

	const handleDeleteCountryFreeShipping = (index: number) => {
		const currentValues = form.getValues().freeShippingCountriesIds;
		const updatedValues = currentValues.filter((_, i) => i !== index);
		form.setValue('freeShippingCountriesIds', updatedValues);
	};

	return (
		<AlertDialog>
			<Card
				className={cn(
					'w-full transition-all duration-300 relative',
					isLoading && 'pointer-events-none opacity-60 select-none cursor-not-allowed',
				)}
			>
				{isLoading && (
					<div className='absolute inset-0 bg-background/50 backdrop-blur-[1px] z-[50] flex items-center justify-center rounded-lg'>
						<div className='flex items-center gap-2 px-4 py-2 bg-card border shadow-lg rounded-md text-sm font-medium text-foreground'>
							<Loader2 className='w-4 h-4 animate-spin text-blue-500' />
							Saving product...
						</div>
					</div>
				)}
				<CardHeader>
					<CardTitle>
						{isNewVariantPage
							? `Add a new variant to ${data.name}`
							: 'Create a new product'}
					</CardTitle>
					<CardDescription>
						{data?.productId && data.variantId
							? `Update ${data?.name} product information.`
							: ' Lets create a product. You can edit product later from the product page.'}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{/* AI Product Assistant - Only show when creating new product */}
					{/* {!data?.productId && !isNewVariantPage && (
						<AIProductAssistant
							categories={categories}
							onGenerate={handleAIGenerate}
							selectedCategoryId={aiCategoryId}
							selectedSubCategoryId={aiSubCategoryId}
							onCategoryChange={handleAICategoryChange}
							onSubCategoryChange={handleAISubCategoryChange}
						/>
					)} */}

					{!data?.productId && !isNewVariantPage && (
						<div className='mb-6 w-full'>
							<AIToggle
								open={aiPanelOpen}
								onToggle={() => setAiPanelOpen((s) => !s)}
								position='inline'
							>
								{/* You already have an AIProductAssistant component - we render it inside the toggle */}
								<AIProductAssistant
									categories={categories as any}
									onGenerate={handleAIGenerate}
									selectedCategoryId={aiCategoryId}
									selectedSubCategoryId={aiSubCategoryId}
									onCategoryChange={handleAICategoryChange}
									onSubCategoryChange={handleAISubCategoryChange}
								/>
							</AIToggle>
						</div>
					)}

					{/* If AI generated or after creation, show ImagePromptSection */}
					{(isAiGenerated || generatedImageUrls.length > 0) && (
						<ImagePromptSection
							initialPrompt={imagePrompt}
							productDetails={{
								name: form.getValues().name,
								description: form.getValues().description,
								variantName: form.getValues().variantName,
								variantDescription: form.getValues().variantDescription,
								brand: form.getValues().brand,
								colors: form.getValues().colors,
							}}
							onAddImages={handleAddImagesToProduct}
						/>
					)}

					<Form {...form}>
						<form
							// onSubmit={form.handleSubmit(handleSubmit)}
							onSubmit={(e) => {
								e.preventDefault();
								console.log('native submit event prevented');
								// call RHF submit with custom onError to log validation errors
								const submitFn = form.handleSubmit(
									async (values) => {
										console.log('form validated calling handleSubmit'); // should print
										await handleSubmit();
									},
									(errors) => {
										console.log('validation errors on submit:', errors);
										// show a human hint so you don't miss it
										toast.error(
											'Fix validation errors. See console for details.',
										);
									},
								);
								submitFn(e);
							}}
							className='space-y-4'
						>
							{/* Images - colors */}
							<div className='flex flex-col gap-y-6 xl:flex-row'>
								{/* Images */}
								<FormField
									control={form.control}
									name='images'
									render={({ field }) => (
										<FormItem className='w-full xl:border-r'>
											<FormControl>
												<div>
													<ImagesPreviewGrid
														images={images}
														onRemove={(url) => {
															handleRemoveImage(url);
														}}
														colors={colors}
														setColors={setColors}
													/>
													<FormMessage className='!mt-4' />
													<ImageUpload
														dontShowPreview
														type='standard'
														value={images.map((img) => img.url)}
														disabled={isLoading}
														onChange={(url) => {
															// ImageUpload will call this when an image upload succeeds
															handleAddImage(url);
														}}
														onRemove={(url) => {
															handleRemoveImage(url);
														}}
													/>
												</div>
											</FormControl>
										</FormItem>
									)}
								/>
								{/* Colors */}
								<div className='w-full flex flex-col gap-y-3 xl:pl-5'>
									<ClickToAddInputs
										details={data?.colors || colors}
										setDetails={setColors}
										initialDetail={{ color: '' }}
										header='Colors'
										colorPicker
									/>
									{isAiGenerated && <AIBadge />}
									{errors.colors && (
										<span className='text-sm font-medium text-destructive'>
											{errors.colors.message}
										</span>
									)}
								</div>
							</div>
							{/* Name */}
							<InputFieldset label='Name'>
								<div className='flex flex-col lg:flex-row gap-4'>
									{!isNewVariantPage && (
										<FormField
											disabled={isLoading}
											control={form.control}
											name='name'
											render={({ field }) => (
												<FormItem className='flex-1'>
													<FormControl>
														<Input placeholder='Product name' {...field} />
													</FormControl>
													<FormMessage />
													{isAiGenerated && <AIBadge />}
												</FormItem>
											)}
										/>
									)}
									<FormField
										disabled={isLoading}
										control={form.control}
										name='variantName'
										render={({ field }) => (
											<FormItem className='flex-1'>
												<FormControl>
													<Input placeholder='Variant name' {...field} />
												</FormControl>
												{isAiGenerated && <AIBadge />}

												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</InputFieldset>
							{/* Product and variant description editors (tabs) */}
							<InputFieldset
								label='Description'
								description={
									isNewVariantPage
										? ''
										: "Note: The product description is the main description for the product (Will display in every variant page). You can add an extra description specific to this variant using 'Variant description' tab."
								}
							>
								<Tabs
									defaultValue={isNewVariantPage ? 'variant' : 'product'}
									className='w-full'
								>
									{!isNewVariantPage && (
										<TabsList className='w-full grid grid-cols-2'>
											<TabsTrigger value='product'>
												Product description
											</TabsTrigger>
											<TabsTrigger value='variant'>
												Variant description
											</TabsTrigger>
										</TabsList>
									)}
									<TabsContent value='product'>
										<FormField
											disabled={isLoading}
											control={form.control}
											name='description'
											render={({ field }) => (
												<FormItem className='flex-1'>
													<FormControl>
														<JoditEditor
															ref={productDescEditor}
															config={config}
															value={form.getValues().description}
															onBlur={(content) => {
																form.setValue('description', content);
															}}
														/>
													</FormControl>
													{isAiGenerated && <AIBadge />}
													<FormMessage />
												</FormItem>
											)}
										/>
									</TabsContent>
									<TabsContent value='variant'>
										<FormField
											disabled={isLoading}
											control={form.control}
											name='variantDescription'
											render={({ field }) => (
												<FormItem className='flex-1'>
													<FormControl>
														<JoditEditor
															ref={variantDescEditor}
															config={config}
															value={form.getValues().variantDescription || ''}
															onBlur={(content) => {
																form.setValue('variantDescription', content);
															}}
														/>
													</FormControl>
													{isAiGenerated && <AIBadge />}
													<FormMessage />
												</FormItem>
											)}
										/>
									</TabsContent>
								</Tabs>
							</InputFieldset>
							{/* Category - SubCategory - offer*/}
							{!isNewVariantPage && (
								<InputFieldset label='Category'>
									<div className='grid grid-cols-1 md:grid-cols-2 lg:md:grid-cols-3 gap-4'>
										<FormField
											disabled={isLoading}
											control={form.control}
											name='categoryId'
											render={({ field }) => (
												<FormItem className='flex-1 w-full'>
													<Select
														disabled={isLoading || categories.length == 0}
														onValueChange={field.onChange}
														value={field.value}
														defaultValue={field.value}
													>
														<FormControl>
															<SelectTrigger>
																<SelectValue
																	defaultValue={field.value}
																	placeholder='Select a category'
																/>
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{categories.map((category) => (
																<SelectItem
																	key={category.id}
																	value={category.id}
																>
																	{category.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											disabled={isLoading}
											control={form.control}
											name='subCategoryId'
											render={({ field }) => (
												<FormItem className='flex-1'>
													<Select
														disabled={
															isLoading ||
															categories.length == 0 ||
															!selectedCategoryId
														}
														onValueChange={field.onChange}
														value={field.value}
														defaultValue={field.value}
													>
														<FormControl>
															<SelectTrigger>
																<SelectValue
																	defaultValue={field.value}
																	placeholder={
																		!selectedCategoryId
																			? 'Select a category'
																			: subCategories.length === 0
																				? 'No sub-categories'
																				: 'Select a sub-category'
																	}
																/>
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{subCategories.length > 0 ? (
																subCategories.map((sub) => (
																	<SelectItem key={sub.id} value={sub.id}>
																		{sub.name}
																	</SelectItem>
																))
															) : (
																<div className='py-3 px-2 text-center text-xs text-muted-foreground select-none'>
																	No sub-categories available
																</div>
															)}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
										{/* Offer Tag */}
										<FormField
											disabled={isLoading}
											control={form.control}
											name='offerTagId'
											render={({ field }) => (
												<FormItem className='flex-1'>
													<Select
														disabled={isLoading || categories.length == 0}
														onValueChange={field.onChange}
														value={field.value}
														defaultValue={field.value}
													>
														<FormControl>
															<SelectTrigger>
																<SelectValue
																	defaultValue={field.value}
																	placeholder='Select an offer'
																/>
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{offerTags &&
																offerTags.map((offer) => (
																	<SelectItem key={offer.id} value={offer.id}>
																		{offer.name}
																	</SelectItem>
																))}
														</SelectContent>
													</Select>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</InputFieldset>
							)}
							{/* Brand, Sku, Weight */}
							<InputFieldset
								label={isNewVariantPage ? 'Sku, Weight' : 'Brand, Sku, Weight'}
							>
								<div className='flex flex-col lg:flex-row gap-4'>
									{!isNewVariantPage && (
										<FormField
											disabled={isLoading}
											control={form.control}
											name='brand'
											render={({ field }) => (
												<FormItem className='flex-1'>
													<FormControl>
														<Input placeholder='Product brand' {...field} />
													</FormControl>
													{isAiGenerated && <AIBadge />}
													<FormMessage />
												</FormItem>
											)}
										/>
									)}
									<FormField
										disabled={isLoading}
										control={form.control}
										name='sku'
										render={({ field }) => (
											<FormItem className='flex-1'>
												<FormControl>
													<Input placeholder='Product sku' {...field} />
												</FormControl>
												{isAiGenerated && <AIBadge />}
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										disabled={isLoading}
										control={form.control}
										name='weight'
										render={({ field }) => (
											<FormItem className='flex-1'>
												<FormControl>
													<NumberInput
														defaultValue={field.value}
														onValueChange={field.onChange}
														placeholder='Product weight'
														min={0.01}
														step={0.01}
														className='!shadow-none rounded-md !text-sm pl-2'
													/>
												</FormControl>
												{isAiGenerated && <AIBadge />}
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</InputFieldset>
							{/* Variant image - Keywords*/}
							<div className='flex items-center gap-10 py-14'>
								{/* Variant image */}
								<div className='border-r pr-10'>
									<FormField
										control={form.control}
										name='variantImage'
										render={({ field }) => (
											<FormItem>
												<FormLabel className='ml-14'>Variant Image</FormLabel>
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
													/>
												</FormControl>
												<FormMessage className='!mt-4' />
											</FormItem>
										)}
									/>
								</div>
								{/* Keywords */}
								<div className='w-full flex-1 space-y-3'>
									<FormField
										control={form.control}
										name='keywords'
										render={({ field }) => (
											<FormItem className='relative flex-1'>
												<FormLabel>Product Keywords</FormLabel>
												<FormControl>
													<ReactTags
														handleAddition={handleAddition}
														handleDelete={() => { }}
														placeholder='Keywords (e.g., winter jacket, warm, stylish)'
														classNames={{
															tagInputField:
																'bg-background border rounded-md p-2 w-full focus:outline-none',
														}}
													/>
												</FormControl>

												<FormMessage />
											</FormItem>
										)}
									/>
									<div className='flex flex-wrap gap-1'>
										{keywords.map((k, i) => (
											<div
												key={i}
												className='text-xs inline-flex items-center px-3 py-1 bg-blue-200 text-blue-700 rounded-full gap-x-2'
											>
												<span>{k}</span>
												<span
													className='cursor-pointer'
													onClick={() => handleDeleteKeyword(i)}
												>
													x
												</span>
											</div>
										))}
									</div>
									{isAiGenerated && <AIBadge />}
								</div>
							</div>
							{/* Sizes*/}
							<InputFieldset label='Sizes, Quantities, Prices, Discounts'>
								<div className='w-full flex flex-col gap-y-3'>
									<ClickToAddInputs
										details={sizes}
										setDetails={setSizes}
										initialDetail={{
											size: '',
											quantity: 1,
											price: 1,
											discount: 0,
										}}
										isAiGenerated={isAiGenerated}
										containerClassName='flex-1'
										inputClassName='w-full'
									/>
									{/* {isAiGenerated && <AIBadge />} */}
									{errors.sizes && (
										<span className='text-sm font-medium text-destructive'>
											{errors.sizes.message}
										</span>
									)}
								</div>
							</InputFieldset>
							{/* Product and variant specs*/}
							<InputFieldset
								label='Specifications'
								description={
									isNewVariantPage
										? ''
										: "Note: The product specifications are the main specs for the product (Will display in every variant page). You can add extra specs specific to this variant using 'Variant Specifications' tab."
								}
							>
								<Tabs
									defaultValue={
										isNewVariantPage ? 'variantSpecs' : 'productSpecs'
									}
									className='w-full'
								>
									{!isNewVariantPage && (
										<TabsList className='w-full grid grid-cols-2'>
											<TabsTrigger value='productSpecs'>
												Product Specifications
											</TabsTrigger>
											<TabsTrigger value='variantSpecs'>
												Variant Specifications
											</TabsTrigger>
										</TabsList>
									)}
									<TabsContent value='productSpecs'>
										<div className='w-full flex flex-col gap-y-3'>
											<ClickToAddInputs
												details={productSpecs}
												setDetails={setProductSpecs}
												initialDetail={{
													name: '',
													value: '',
												}}
												containerClassName='flex-1'
												inputClassName='w-full'
											/>
											{isAiGenerated && <AIBadge />}
											{errors.product_specs && (
												<span className='text-sm font-medium text-destructive'>
													{errors.product_specs.message}
												</span>
											)}
										</div>
									</TabsContent>
									<TabsContent value='variantSpecs'>
										<div className='w-full flex flex-col gap-y-3'>
											<ClickToAddInputs
												details={variantSpecs}
												setDetails={setVariantSpecs}
												initialDetail={{
													name: '',
													value: '',
												}}
												containerClassName='flex-1'
												inputClassName='w-full'
											/>
											{isAiGenerated && <AIBadge />}
											{errors.variant_specs && (
												<span className='text-sm font-medium text-destructive'>
													{errors.variant_specs.message}
												</span>
											)}
										</div>
									</TabsContent>
								</Tabs>
							</InputFieldset>
							{/* Questions*/}
							{!isNewVariantPage && (
								<InputFieldset label='Questions & Answers'>
									<div className='w-full flex flex-col gap-y-3'>
										<ClickToAddInputs
											details={questions}
											setDetails={setQuestions}
											initialDetail={{
												question: '',
												answer: '',
											}}
											containerClassName='flex-1'
											inputClassName='w-full'
										/>
										{isAiGenerated && <AIBadge />}
										{errors.questions && (
											<span className='text-sm font-medium text-destructive'>
												{errors.questions.message}
											</span>
										)}
									</div>
								</InputFieldset>
							)}
							{/* Is On Sale */}
							<InputFieldset
								label='Sale'
								description='Is your product on sale ?'
							>
								<div>
									<label
										htmlFor='yes'
										className='ml-5 flex items-center gap-x-2 cursor-pointer'
									>
										<FormField
											control={form.control}
											name='isSale'
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<div>
															<input
																type='checkbox'
																id='yes'
																checked={field.value}
																onChange={field.onChange}
																hidden
															/>
															<Checkbox
																checked={field.value}
																onCheckedChange={field.onChange}
															/>
														</div>
													</FormControl>
												</FormItem>
											)}
										/>
										<span>Yes</span>
									</label>
									{form.getValues().isSale && (
										<div className='mt-5'>
											<p className='text-sm text-main-secondary dark:text-gray-400 pb-3 flex'>
												<Dot className='-me-1' />
												When sale does end ?
											</p>
											<div className='flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap'>
												<FormField
													control={form.control}
													name='saleEndDate'
													render={({ field }) => (
														<FormItem className='ml-0 sm:ml-4 max-w-full'>
															<FormControl>
																<div ref={dateTimePickerRef} className='inline-block max-w-full'>
																	<DateTimePicker
																		calendarProps={{ showFixedNumberOfWeeks: true }}
																		className='inline-flex items-center gap-2 p-2 border rounded-md shadow-sm max-w-full'
																		calendarIcon={
																			<span className='text-gray-500 hover:text-gray-600 cursor-pointer'>
																				📅
																			</span>
																		}
																		clearIcon={
																			<span className='text-gray-500 hover:text-gray-600 cursor-pointer'>
																				✖️
																			</span>
																		}
																		onChange={(date) => {
																			field.onChange(
																				date
																					? format(date, "yyyy-MM-dd'T'HH:mm:ss")
																					: '',
																			);
																		}}
																		value={
																			field.value ? new Date(field.value) : null
																		}
																	/>
																</div>
															</FormControl>
														</FormItem>
													)}
												/>
												<div className='flex items-center gap-2 text-xs sm:text-sm font-medium text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 rounded-md border border-blue-200 dark:border-blue-800/50 max-w-full'>
													<ArrowRight className='w-4 h-4 shrink-0 text-[#1087ff]' />
													<span className='break-words'>{formattedDate}</span>
												</div>
											</div>
										</div>
									)}
								</div>
							</InputFieldset>
							{/* Shipping fee method */}
							{!isNewVariantPage && (
								<InputFieldset label='Product shipping fee method'>
									<FormField
										disabled={isLoading}
										control={form.control}
										name='shippingFeeMethod'
										render={({ field }) => (
											<FormItem className='flex-1'>
												<Select
													disabled={isLoading}
													onValueChange={field.onChange}
													value={field.value}
													defaultValue={field.value}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue
																defaultValue={field.value}
																placeholder='Select Shipping Fee Calculation method'
															/>
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{shippingFeeMethods.map((method) => (
															<SelectItem
																key={method.value}
																value={method.value}
															>
																{method.description}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
								</InputFieldset>
							)}
							{/* Fee Shipping */}
							{!isNewVariantPage && (
								<InputFieldset
									label='Free Shipping (Optional)'
									description='Free Shipping Worldwide ?'
								>
									<div>
										<label
											htmlFor='freeShippingForAll'
											className='ml-5 flex items-center gap-x-2 cursor-pointer'
										>
											<FormField
												control={form.control}
												name='freeShippingForAllCountries'
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<div>
																<input
																	type='checkbox'
																	id='freeShippingForAll'
																	checked={field.value}
																	onChange={field.onChange}
																	hidden
																/>
																<Checkbox
																	checked={field.value}
																	onCheckedChange={field.onChange}
																/>
															</div>
														</FormControl>
													</FormItem>
												)}
											/>
											<span>Yes</span>
										</label>
									</div>
									<div>
										<p className='mt-4 text-sm text-main-secondary dark:text-gray-400 pb-3 flex'>
											<Dot className='-me-1' />
											If not select the countries you want to ship this product
											to for free
										</p>
									</div>

									<div>
										{!form.getValues().freeShippingForAllCountries && (
											<div>
												<FormField
													control={form.control}
													name='freeShippingCountriesIds'
													render={({ field }) => (
														<FormItem>
															<FormControl>
																{/* wrapper to scope our overrides */}
																<div className='!max-w-[800px]'>
																	<MultiSelect
																		className={
																			'w-full rounded-md px-2 py-1 text-sm'
																		}
																		options={countryOptions}
																		value={field.value}
																		onChange={(selected: CountryOption[]) => {
																			field.onChange(selected);
																		}}
																		labelledBy='Select'
																	/>
																</div>
															</FormControl>
														</FormItem>
													)}
												/>
												<p className='mt-4 text-sm text-main-secondary dark:text-gray-400 pb-3 flex items-center'>
													<Dot className='me-1' />
													List of countries you offer free shipping for this
													product:&nbsp;
													{(!form.getValues().freeShippingCountriesIds ||
														form.getValues().freeShippingCountriesIds.length ===
														0) &&
														'None'}
												</p>

												{/* Free shipping countries chips */}
												<div className='flex flex-wrap gap-2 mt-2'>
													{form.getValues().freeShippingCountriesIds?.length ? (
														form
															.getValues()
															.freeShippingCountriesIds.map(
																(country, index) => (
																	<div
																		key={`${country?.value ?? country?.id ?? index
																			}`}
																		className={
																			'text-xs inline-flex items-center px-3 py-1 rounded-md gap-x-2 ' +
																			'bg-blue-200 text-blue-primary dark:bg-slate-700 dark:text-blue-200'
																		}
																	>
																		<span>{country.label}</span>
																		<button
																			type='button'
																			aria-label={`Remove ${country.label}`}
																			onClick={() =>
																				handleDeleteCountryFreeShipping(index)
																			}
																			className='ml-2 text-sm hover:text-red-500'
																		>
																			×
																		</button>
																	</div>
																),
															)
													) : (
														<div className='text-sm text-main-secondary dark:text-gray-400'>
															None
														</div>
													)}
												</div>
											</div>
										)}
									</div>
								</InputFieldset>
							)}
							{/* <Button type='submit' disabled={isLoading}>
								{isLoading
									? 'loading...'
									: data?.productId && data.variantId
									? 'Save product information'
									: 'Create product'}
							</Button> */}
							<Button
								type='button'
								disabled={isLoading}
								onClick={() => {
									console.log('button clicked - manual submit');
									const submitFn = form.handleSubmit(
										async (values) => {
											console.log(
												'manual form validated → calling handleSubmit',
											);
											await handleSubmit();
										},
										(errors) => {
											console.log(
												'validation errors on manual submit:',
												errors,
											);
											toast.error(
												'Fix validation errors. See console for details.',
											);
										},
									);
									submitFn();
								}}
							>
								{isLoading
									? 'loading...'
									: data?.productId && data.variantId
										? 'Save product information'
										: 'Create product'}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</AlertDialog>
	);
};

export const AIBadge = () => (
	<span className='inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full'>
		<Sparkles className='w-3 h-3' />
		AI Generated
	</span>
);


export default ProductDetails;
