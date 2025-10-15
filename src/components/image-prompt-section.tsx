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
	onGeneratePrompt?: () => Promise<void>; // optional hook if you want to drive generation externally
}

const SkeletonCard: FC = () => (
	<div className='rounded overflow-hidden border bg-muted p-2'>
		<div className='w-full h-40 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse rounded' />
		<div className='mt-2 h-3 bg-gray-200 animate-pulse rounded w-3/4' />
	</div>
);

const ImagePromptSection: FC<Props> = ({
	initialPrompt = '',
	productDetails,
	onAddImages,
}) => {
	const [prompt, setPrompt] = useState(initialPrompt);
	const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
	const [isGeneratingImages, setIsGeneratingImages] = useState(false);
	const [generatedImages, setGeneratedImages] = useState<string[]>([]);
	const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
	const [imageCount, setImageCount] = useState<number>(4);
	const [angleSet, setAngleSet] = useState<'varied' | 'angles'>('varied');

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

	async function generatePromptFromServer() {
		setIsGeneratingPrompt(true);
		try {
			// If you have your /api/generate-image-prompt route
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

	async function generateImages() {
		if (!prompt?.trim()) {
			toast.error('Provide a prompt');
			return;
		}
		setIsGeneratingImages(true);
		try {
			const res = await fetch('/api/generate-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prompt, count: imageCount, style: angleSet }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.error || 'Image generation failed');
			const urls: string[] = json.images || [];
			setGeneratedImages(urls);
			// reset selected map
			const map: Record<string, boolean> = {};
			urls.forEach((u) => (map[u] = false));
			setSelectedMap(map);
			toast.success('Images generated');
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
	}

	function addAllToProduct() {
		if (generatedImages.length === 0) return toast.error('No images generated');
		onAddImages(generatedImages);
		toast.success(`All ${generatedImages.length} images added`);
		setSelectedMap({});
	}

	return (
		<div
			className='mt-6 p-4 border rounded-lg bg-muted
		mb-8'
		>
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
					Build from product details
				</Button>

				<div className='ml-auto flex items-center gap-3'>
					<div className='flex items-center gap-2'>
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

					<div className='flex items-center gap-2'>
						<label className='text-xs'>Angle</label>
						<Select
							value={angleSet}
							onValueChange={(v) => setAngleSet(v as any)}
						>
							<SelectTrigger className='w-40'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='varied'>Varied</SelectItem>
								<SelectItem value='angles'>6 Angles</SelectItem>
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
				<Button onClick={generateImages} disabled={isGeneratingImages}>
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

			{isGeneratingImages && (
				<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
					{Array.from({ length: imageCount }).map((_, i) => (
						<motion.div
							key={i}
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
						{generatedImages.map((u) => (
							<div key={u} className='relative border rounded overflow-hidden'>
								<div className='w-full h-40 relative'>
									<Image
										src={u}
										alt='generated'
										fill
										className='object-cover'
										sizes='(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw'
										// priority={false}
									/>
								</div>
								<button
									type='button'
									onClick={() => toggleSelect(u)}
									className={`absolute top-2 right-2 rounded px-2 py-1 text-xs ${
										selectedMap[u]
											? 'bg-green-600 text-white'
											: 'bg-white/90 text-black'
									}`}
								>
									{selectedMap[u] ? 'Selected' : 'Select'}
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
