/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { FC, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';

interface Props {
	initialPrompt?: string;
	productDetails: {
		name?: string;
		description?: string;
		variantName?: string;
		variantDescription?: string;
		brand?: string;
		colors?: { color: string }[];
	};
	onAddImages: (urls: string[]) => void;
	onGeneratePrompt?: () => Promise<void>;
}

const SkeletonCard: FC = () => (
	<div className='rounded overflow-hidden border bg-muted p-2'>
		<div className='w-full h-40 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse rounded' />
		<div className='mt-2 h-3 bg-gray-200 animate-pulse rounded w-3/4' />
	</div>
);

interface GeneratedImage {
	url: string;
	completed: boolean;
}

const ImagePromptSection: FC<Props> = ({
	initialPrompt = '',
	productDetails,
	onAddImages,
}) => {
	const [prompt, setPrompt] = useState(initialPrompt);
	const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
	const [isGeneratingImages, setIsGeneratingImages] = useState(false);
	const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
	const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
	const [imageCount, setImageCount] = useState<number>(4);
	const [angleSet, setAngleSet] = useState<'varied' | 'angles'>('varied');
	const [generationSource, setGenerationSource] = useState<
		'frontend' | 'backend'
	>('frontend');
	const [imageVariant, setImageVariant] = useState<
		'studio' | 'lifestyle' | 'detail'
	>('studio');

	const buildProductDetailsString = () => {
		const {
			name,
			brand,
			description,
			variantName,
			variantDescription,
			colors,
		} = productDetails;
		const colorList = (colors || []).map((c) => c.color).join(', ');
		return `${name || ''} — ${variantName || ''} — Brand: ${
			brand || ''
		}. Colors: ${colorList}. ${description || ''} ${
			variantDescription || ''
		}`.trim();
	};

	const enhancePromptWithVariant = (basePrompt: string): string => {
		const variants = {
			studio: `${basePrompt}. Style: Professional studio photography, white background, professional lighting, 90-degree angle view, clean commercial product shot.`,
			lifestyle: `${basePrompt}. Style: Lifestyle product photography, natural setting, realistic usage context, environmental context, warm lighting.`,
			detail: `${basePrompt}. Style: Detailed close-up macro photography, texture visible, material details visible, artisanal presentation, studio lighting on details.`,
		};
		return variants[imageVariant];
	};

	const enhancePromptWithAngle = (
		basePrompt: string,
		index: number,
	): string => {
		if (angleSet === 'varied') {
			return basePrompt;
		}

		const angles = [
			'front view, 0 degrees',
			'45 degree angle, three-quarter view',
			'side view, 90 degrees',
			'top-down view, 180 degrees overhead',
			'bottom-up view, product tilted',
			'dynamic angle, product in motion or positioned naturally',
		];

		const angleText = angles[index % angles.length];
		return `${basePrompt}. Camera angle: ${angleText}`;
	};

	async function generatePromptFromServer() {
		setIsGeneratingPrompt(true);
		try {
			const res = await fetch('/api/generate-image-prompt', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: productDetails.name,
					description: productDetails.description,
					variantName: productDetails.variantName,
					variantDescription: productDetails.variantDescription,
					brand: productDetails.brand,
					colors: productDetails.colors,
				}),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.error || json?.details || 'Failed');
			setPrompt(json.imagePrompt || '');
			toast.success('Image prompt generated');
		} catch (err: any) {
			console.error(err);
			toast.error(err?.message || 'Failed to generate prompt');
		} finally {
			setIsGeneratingPrompt(false);
		}
	}

	// Frontend generation with real-time image display
	async function generateImagesWithPuter() {
		if (!prompt?.trim()) {
			toast.error('Provide a prompt');
			return;
		}

		setIsGeneratingImages(true);
		setGeneratedImages([]);

		const timeoutId = setTimeout(() => {
			setIsGeneratingImages(false);
			toast.error('Generation timeout');
		}, 300000); // 5 minute timeout

		try {
			if (!(window as any).puter) {
				const script = document.createElement('script');
				script.src = 'https://js.puter.com/v2/';
				script.async = true;

				const scriptLoadPromise = new Promise<void>((resolve, reject) => {
					script.onload = () => resolve();
					script.onerror = () =>
						reject(new Error('Puter.js script failed to load'));
					document.head.appendChild(script);
				});

				await scriptLoadPromise;
			}

			const puter = (window as any).puter;
			if (!puter || !puter.ai) {
				throw new Error('Puter.js not available');
			}

			const images: GeneratedImage[] = [];
			toast.info('Generating images...');

			for (let i = 0; i < imageCount; i++) {
				try {
					const enhancedPrompt = enhancePromptWithAngle(
						enhancePromptWithVariant(prompt),
						i,
					);

					console.log(`Generating image ${i + 1}/${imageCount}...`);

					const imageElement = await puter.ai.txt2img(enhancedPrompt, {
						model: 'gpt-image-1',
					});

					let imageUrl = '';
					if (imageElement?.src) {
						imageUrl = imageElement.src;
					} else if (imageElement instanceof HTMLImageElement) {
						imageUrl = imageElement.src;
					}

					if (imageUrl) {
						const newImage: GeneratedImage = {
							url: imageUrl,
							completed: true,
						};
						images.push(newImage);
						setGeneratedImages([...images]);
						console.log(`Image ${i + 1} displayed`);
					}
				} catch (err: any) {
					console.error(`Image ${i + 1} error:`, err);
					toast.error(`Image ${i + 1} failed`);
				}
			}

			clearTimeout(timeoutId);

			if (images.length === 0) {
				throw new Error('No images generated');
			}

			const map: Record<string, boolean> = {};
			images.forEach((img) => (map[img.url] = false));
			setSelectedMap(map);
			toast.success(`${images.length} images generated!`);
		} catch (err: any) {
			clearTimeout(timeoutId);
			console.error('Puter error:', err);
			toast.error(err?.message || 'Failed to generate images');
		} finally {
			setIsGeneratingImages(false);
		}
	}

	// Backend generation (Gemini with fallback)
	async function generateImagesWithBackend() {
		if (!prompt?.trim()) {
			toast.error('Provide a prompt');
			return;
		}

		setIsGeneratingImages(true);
		setGeneratedImages([]);

		try {
			const images: GeneratedImage[] = [];

			for (let i = 0; i < imageCount; i++) {
				try {
					const enhancedPrompt = enhancePromptWithAngle(
						enhancePromptWithVariant(prompt),
						i,
					);

					const res = await fetch('/api/generate-image', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							prompt: enhancedPrompt,
							count: 1,
							style: angleSet,
						}),
					});

					const json = await res.json();
					if (res.ok && json.images && json.images.length > 0) {
						const newImage: GeneratedImage = {
							url: json.images[0],
							completed: true,
						};
						images.push(newImage);
						setGeneratedImages([...images]);
						console.log(`Image ${i + 1} displayed`);
					}
				} catch (err: any) {
					console.error(`Image ${i + 1} error:`, err);
				}
			}

			if (images.length === 0) {
				throw new Error('Failed to generate images');
			}

			const map: Record<string, boolean> = {};
			images.forEach((img) => (map[img.url] = false));
			setSelectedMap(map);
			toast.success(`${images.length} images generated!`);
		} catch (err: any) {
			console.error(err);
			toast.error(err?.message || 'Failed to generate images');
		} finally {
			setIsGeneratingImages(false);
		}
	}

	function toggleSelect(url: string) {
		setSelectedMap((s) => ({ ...s, [url]: !s[url] }));
	}

	function addSelectedToProduct() {
		const chosen = Object.keys(selectedMap).filter((u) => selectedMap[u]);
		if (chosen.length === 0) return toast.error('Select at least one image');
		onAddImages(chosen);
		toast.success(`${chosen.length} image(s) added`);
		setSelectedMap({});
		setGeneratedImages([]);
	}

	function addAllToProduct() {
		if (generatedImages.length === 0) return toast.error('No images generated');
		onAddImages(generatedImages.map((img) => img.url));
		toast.success(`All ${generatedImages.length} images added`);
		setSelectedMap({});
		setGeneratedImages([]);
	}

	return (
		<div className='mt-6 p-4 border rounded-lg bg-muted mb-8'>
			<h3 className='font-semibold mb-2'>Generate Product Images</h3>

			<div className='flex gap-2 items-center mb-3'>
				<Button
					size='sm'
					onClick={generatePromptFromServer}
					disabled={isGeneratingPrompt}
				>
					{isGeneratingPrompt ? 'Generating prompt...' : 'Auto-generate prompt'}
				</Button>

				<Button
					variant='outline'
					size='sm'
					onClick={() => setPrompt(buildProductDetailsString())}
				>
					Build from details
				</Button>

				<div className='ml-auto flex items-center gap-2'>
					<div className='flex items-center gap-1'>
						<label className='text-xs'>Source</label>
						<Select
							value={generationSource}
							onValueChange={(v) =>
								setGenerationSource(v as 'frontend' | 'backend')
							}
						>
							<SelectTrigger className='w-32'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='frontend'>AI (Puter)</SelectItem>
								<SelectItem value='backend'>Gemini + Fallback</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className='flex items-center gap-1'>
						<label className='text-xs'>Style</label>
						<Select
							value={imageVariant}
							onValueChange={(v) =>
								setImageVariant(v as 'studio' | 'lifestyle' | 'detail')
							}
						>
							<SelectTrigger className='w-28'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='studio'>Studio</SelectItem>
								<SelectItem value='lifestyle'>Lifestyle</SelectItem>
								<SelectItem value='detail'>Detail</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className='flex items-center gap-1'>
						<label className='text-xs'>Angle</label>
						<Select
							value={angleSet}
							onValueChange={(v) => setAngleSet(v as 'varied' | 'angles')}
						>
							<SelectTrigger className='w-28'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='varied'>Varied</SelectItem>
								<SelectItem value='angles'>6 Angles</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className='flex items-center gap-1'>
						<label className='text-xs'>Count</label>
						<Select
							value={String(imageCount)}
							onValueChange={(v) => setImageCount(Number(v))}
						>
							<SelectTrigger className='w-20'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='1'>1</SelectItem>
								<SelectItem value='2'>2</SelectItem>
								<SelectItem value='3'>3</SelectItem>
								<SelectItem value='4'>4</SelectItem>
								<SelectItem value='6'>6</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<Textarea
				value={prompt}
				onChange={(e) => setPrompt(e.currentTarget.value)}
				rows={4}
				className='mb-3'
			/>

			<div className='flex gap-2 mb-3'>
				<Button
					onClick={() =>
						generationSource === 'frontend'
							? generateImagesWithPuter()
							: generateImagesWithBackend()
					}
					disabled={isGeneratingImages}
				>
					{isGeneratingImages ? (
						<>
							<Loader2 className='mr-2 h-4 w-4 animate-spin' /> Generating...
						</>
					) : (
						'Generate Images'
					)}
				</Button>

				<Button
					variant='ghost'
					onClick={() => {
						setPrompt('');
						setGeneratedImages([]);
						setSelectedMap({});
					}}
				>
					Reset
				</Button>
			</div>

			{isGeneratingImages && generatedImages.length < imageCount && (
				<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
					{generatedImages.map((img) => (
						<div
							key={img.url}
							className='relative border rounded overflow-hidden'
						>
							<div className='w-full h-40 relative'>
								<Image
									src={img.url}
									alt='generated'
									fill
									className='object-cover'
									sizes='(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw'
								/>
							</div>
							<button
								type='button'
								onClick={() => toggleSelect(img.url)}
								className={`absolute top-2 right-2 rounded px-2 py-1 text-xs ${
									selectedMap[img.url]
										? 'bg-green-600 text-white'
										: 'bg-white/90 text-black'
								}`}
							>
								{selectedMap[img.url] ? 'Selected' : 'Select'}
							</button>
						</div>
					))}
					{Array.from({
						length: Math.max(0, imageCount - generatedImages.length),
					}).map((_, i) => (
						<motion.div
							key={`skeleton-${i}`}
							initial={{ opacity: 0.6 }}
							animate={{ opacity: 1 }}
							transition={{ repeat: Infinity, duration: 1.2 }}
						>
							<SkeletonCard />
						</motion.div>
					))}
				</div>
			)}

			{!isGeneratingImages && generatedImages.length > 0 && (
				<>
					<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
						{generatedImages.map((img) => (
							<div
								key={img.url}
								className='relative border rounded overflow-hidden'
							>
								<div className='w-full h-40 relative'>
									<Image
										src={img.url}
										alt='generated'
										fill
										className='object-cover'
										sizes='(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw'
									/>
								</div>
								<button
									type='button'
									onClick={() => toggleSelect(img.url)}
									className={`absolute top-2 right-2 rounded px-2 py-1 text-xs ${
										selectedMap[img.url]
											? 'bg-green-600 text-white'
											: 'bg-white/90 text-black'
									}`}
								>
									{selectedMap[img.url] ? 'Selected' : 'Select'}
								</button>
							</div>
						))}
					</div>

					<div className='flex gap-2 mt-3'>
						<Button onClick={addSelectedToProduct}>
							Add selected to product
						</Button>
						<Button variant='outline' onClick={addAllToProduct}>
							Add all
						</Button>
					</div>
				</>
			)}
		</div>
	);
};

export default ImagePromptSection;
