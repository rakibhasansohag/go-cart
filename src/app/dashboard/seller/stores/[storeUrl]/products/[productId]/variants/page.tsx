import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Edit, FilePenLine, Layers, Plus } from 'lucide-react';

export default async function ProductVariantsPage({
	params,
}: {
	params: Promise<{ storeUrl: string; productId: string }>;
}) {
	const { storeUrl, productId } = await params;

	const product = await db.product.findUnique({
		where: { id: productId },
		include: {
			category: true,
			subCategory: true,
			offerTag: true,
			store: true,
			variants: {
				orderBy: { createdAt: 'asc' },
				include: {
					images: { orderBy: { order: 'asc' } },
					colors: true,
					sizes: true,
				},
			},
		},
	});

	if (!product) {
		notFound();
	}

	return (
		<div className='w-full space-y-6 pb-12'>
			{/* Top Header & Breadcrumb Navigation */}
			<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5'>
				<div className='space-y-1.5'>
					<div className='flex items-center gap-2 text-xs text-muted-foreground mb-1'>
						<Link
							href={`/dashboard/seller/stores/${storeUrl}/products`}
							className='hover:text-foreground flex items-center gap-1 transition-colors'
						>
							<ArrowLeft className='w-3.5 h-3.5' /> Back to Products
						</Link>
					</div>
					<h1 className='text-2xl sm:text-3xl font-bold text-foreground tracking-tight capitalize flex items-center gap-2.5'>
						<Layers className='w-7 h-7 text-primary shrink-0' />
						{product.name}
					</h1>
					<div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1'>
						<Badge variant='outline' className='bg-muted/30 font-medium'>
							{product.category.name}
						</Badge>
						{product.subCategory && (
							<Badge variant='outline' className='bg-muted/30 font-medium'>
								{product.subCategory.name}
							</Badge>
						)}
						{product.brand && (
							<span className='text-muted-foreground font-medium'>
								Brand: <strong className='text-foreground'>{product.brand}</strong>
							</span>
						)}
						<Badge className='bg-primary/15 text-primary border-primary/20 font-semibold'>
							{product.variants.length} {product.variants.length === 1 ? 'Variant' : 'Variants'}
						</Badge>
					</div>
				</div>

				<div className='flex flex-wrap items-center gap-2.5 shrink-0'>
					<Button variant='outline' asChild className='gap-2 rounded-xl text-xs font-semibold'>
						<Link href={`/dashboard/seller/stores/${storeUrl}/products/${productId}`}>
							<FilePenLine className='w-4 h-4' />
							Edit Product Info
						</Link>
					</Button>
					<Button asChild className='gap-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground'>
						<Link href={`/dashboard/seller/stores/${storeUrl}/products/${productId}/variants/new`}>
							<Plus className='w-4 h-4' />
							Add New Variant
						</Link>
					</Button>
				</div>
			</div>

			{/* Variants Grid */}
			<div>
				<div className='flex items-center justify-between mb-4'>
					<h2 className='text-lg font-semibold text-foreground tracking-tight'>
						Product Variants
					</h2>
					<p className='text-xs text-muted-foreground'>
						Manage styles, colors, inventory and pricing for each variant
					</p>
				</div>

				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
					{product.variants.map((variant) => {
						const firstImage = variant.images[0]?.url || '/placeholder.png';
						const totalStock = variant.sizes.reduce((acc, s) => acc + s.quantity, 0);

						return (
							<Card
								key={variant.id}
								className='overflow-hidden border border-border/80 bg-card/60 hover:border-primary/50 transition-all duration-200 shadow-xs flex flex-col group'
							>
								{/* Image */}
								<div className='relative w-full h-48 bg-muted/30 overflow-hidden border-b border-border/40'>
									<Image
										src={firstImage}
										alt={variant.variantName}
										fill
										sizes='(max-width: 768px) 100vw, 300px'
										className='object-cover transition-transform duration-300 group-hover:scale-105'
									/>
									<div className='absolute top-2.5 right-2.5 bg-background/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-border/60 text-[11px] font-mono font-medium text-foreground'>
										Stock: {totalStock}
									</div>
								</div>

								{/* Card Content */}
								<CardHeader className='p-4 pb-2 space-y-1'>
									<div className='flex items-start justify-between gap-2'>
										<CardTitle className='text-base font-bold capitalize truncate text-foreground'>
											{variant.variantName}
										</CardTitle>
									</div>
									<CardDescription className='text-xs text-muted-foreground line-clamp-1'>
										{variant.variantDescription || 'No description set'}
									</CardDescription>
								</CardHeader>

								<CardContent className='p-4 pt-0 flex-1 space-y-3'>
									{/* Colors */}
									{variant.colors.length > 0 && (
										<div className='flex items-center gap-1.5 pt-1'>
											<span className='text-[11px] font-medium text-muted-foreground mr-1'>
												Colors:
											</span>
											<div className='flex flex-wrap gap-1'>
												{variant.colors.map((color) => (
													<span
														key={color.id || color.name}
														className='w-4 h-4 rounded-full border border-black/20 shadow-xs'
														style={{ backgroundColor: color.name }}
														title={color.name}
													/>
												))}
											</div>
										</div>
									)}

									{/* Sizes & Stock Badges */}
									<div className='space-y-1.5 pt-1'>
										<span className='text-[11px] font-medium text-muted-foreground block'>
											Sizes & Pricing:
										</span>
										<div className='flex flex-wrap gap-1.5'>
											{variant.sizes.map((size) => {
												const isOut = size.quantity === 0;
												const isLow = size.quantity > 0 && size.quantity < 5;
												return (
													<Badge
														key={size.id || size.size}
														variant='outline'
														className={`text-[11px] font-medium px-2 py-0.5 border flex items-center gap-1 ${
															isOut
																? 'bg-destructive/10 text-destructive border-destructive/30'
																: isLow
																? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
																: 'bg-muted/30 text-foreground border-border/80'
														}`}
													>
														<span
															className={`w-1.5 h-1.5 rounded-full ${
																isOut
																	? 'bg-destructive'
																	: isLow
																	? 'bg-amber-500'
																	: 'bg-emerald-500'
															}`}
														/>
														{size.size} · ${size.price} ({size.quantity})
													</Badge>
												);
											})}
										</div>
									</div>
								</CardContent>

								{/* Action Footer */}
								<div className='p-4 pt-2 border-t border-border/60 bg-muted/10 mt-auto'>
									<Button variant='outline' size='sm' asChild className='w-full text-xs font-semibold gap-1.5 rounded-lg'>
										<Link
											href={`/dashboard/seller/stores/${storeUrl}/products/${productId}/variants/${variant.id}`}
										>
											<Edit className='w-3.5 h-3.5' /> Edit Variant Details
										</Link>
									</Button>
								</div>
							</Card>
						);
					})}

					{/* Add New Variant Card */}
					<Link
						href={`/dashboard/seller/stores/${storeUrl}/products/${productId}/variants/new`}
						className='group border-2 border-dashed border-border/80 hover:border-primary/70 rounded-2xl p-6 bg-card/20 hover:bg-muted/30 transition-all flex flex-col items-center justify-center text-center min-h-[320px] gap-3'
					>
						<div className='w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform'>
							<Plus className='w-6 h-6' />
						</div>
						<div className='space-y-1'>
							<h3 className='font-semibold text-sm text-foreground'>
								Add Another Variant
							</h3>
							<p className='text-xs text-muted-foreground max-w-[200px]'>
								Add a new color, size, or style variant to this product.
							</p>
						</div>
					</Link>
				</div>
			</div>
		</div>
	);
}
