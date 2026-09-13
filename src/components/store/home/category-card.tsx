import { FeaturedCategoryType } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Layers } from 'lucide-react';

export default function CategoryCard({
	category,
}: {
	category: FeaturedCategoryType;
}) {
	const subs = category.subCategories;
	const count = subs.length;

	return (
		<div className="w-full h-full rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
			{/* Card Header */}
			<Link
				href={`/browse?category=${category.url}`}
				className="px-4 pt-3.5 pb-2.5 flex items-center justify-between group/title"
			>
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-base sm:text-lg text-foreground font-extrabold line-clamp-1 tracking-tight group-hover/title:text-primary transition-colors">
						{category.name}
					</span>
					{category.productCount > 0 && (
						<span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground shrink-0">
							{category.productCount} items
						</span>
					)}
				</div>
				<span className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground group-hover/title:text-primary transition-colors shrink-0">
					<span>View all</span>
					<ArrowRight className="size-3.5 transition-transform group-hover/title:translate-x-0.5" />
				</span>
			</Link>

			{/* Subcategories Display Canvas - Fixed uniform height for all cards */}
			<div className="p-3.5 pt-0.5 h-[230px] sm:h-[250px] w-full">
				{/* Case 0: No subcategories */}
				{count === 0 && (
					<Link
						href={`/browse?category=${category.url}`}
						className="group/sub relative w-full h-full rounded-xl overflow-hidden bg-muted/40 border border-border/60 block shadow-2xs"
					>
						{category.image ? (
							<Image
								src={category.image}
								alt={category.name}
								fill
								sizes="(max-width: 768px) 100vw, 400px"
								className="object-cover group-hover/sub:scale-105 transition-transform duration-300"
							/>
						) : (
							<div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 p-4 text-center">
								<Layers className="size-8 text-muted-foreground/40 mb-2" />
								<span className="text-sm font-medium text-muted-foreground">Explore Collection</span>
							</div>
						)}
						<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-3.5">
							<span className="text-sm sm:text-base font-bold text-white drop-shadow-xs line-clamp-1">
								Browse All {category.name}
							</span>
							<span className="text-xs text-white/80 font-medium drop-shadow-xs">
								{category.productCount} products available
							</span>
						</div>
					</Link>
				)}

				{/* Case 1: Exactly 1 subcategory */}
				{count === 1 && (
					<Link
						href={`/browse?subCategory=${subs[0].url}`}
						className="group/sub relative w-full h-full rounded-xl overflow-hidden bg-muted/40 border border-border/60 block shadow-2xs"
					>
						<Image
							src={subs[0].image}
							alt={subs[0].name}
							fill
							sizes="(max-width: 768px) 100vw, 400px"
							className="object-cover group-hover/sub:scale-105 transition-transform duration-300"
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-3.5">
							<span className="text-sm sm:text-base font-bold text-white drop-shadow-xs line-clamp-1">
								{subs[0].name}
							</span>
							{subs[0].productCount > 0 && (
								<span className="text-xs text-white/80 font-medium drop-shadow-xs">
									{subs[0].productCount} products
								</span>
							)}
						</div>
					</Link>
				)}

				{/* Case 2: Exactly 2 subcategories - side-by-side full-height portrait tiles */}
				{count === 2 && (
					<div className="grid grid-cols-2 gap-2.5 h-full w-full">
						{subs.map((sub) => (
							<Link
								key={sub.id}
								href={`/browse?subCategory=${sub.url}`}
								className="group/sub relative w-full h-full rounded-xl overflow-hidden bg-muted/40 border border-border/60 block shadow-2xs"
							>
								<Image
									src={sub.image}
									alt={sub.name}
									fill
									sizes="(max-width: 768px) 50vw, 200px"
									className="object-cover group-hover/sub:scale-105 transition-transform duration-300"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-3">
									<span className="text-xs sm:text-sm font-semibold text-white drop-shadow-xs truncate block">
										{sub.name}
									</span>
									{sub.productCount > 0 && (
										<span className="text-xs text-white/80 font-medium drop-shadow-xs">
											{sub.productCount} products
										</span>
									)}
								</div>
							</Link>
						))}
					</div>
				)}

				{/* Case 3: Exactly 3 subcategories - 1 hero on left, 2 stacked on right */}
				{count === 3 && (
					<div className="grid grid-cols-2 gap-2.5 h-full w-full">
						{/* Featured larger item */}
						<Link
							href={`/browse?subCategory=${subs[0].url}`}
							className="group/sub relative w-full h-full rounded-xl overflow-hidden bg-muted/40 border border-border/60 block shadow-2xs"
						>
							<Image
								src={subs[0].image}
								alt={subs[0].name}
								fill
								sizes="(max-width: 768px) 50vw, 200px"
								className="object-cover group-hover/sub:scale-105 transition-transform duration-300"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-3">
								<span className="text-xs sm:text-sm font-semibold text-white drop-shadow-xs truncate block">
									{subs[0].name}
								</span>
								{subs[0].productCount > 0 && (
									<span className="text-xs text-white/80 font-medium drop-shadow-xs">
										{subs[0].productCount} items
									</span>
								)}
							</div>
						</Link>

						{/* Stack of 2 items */}
						<div className="flex flex-col gap-2.5 h-full min-h-0">
							{subs.slice(1, 3).map((sub) => (
								<Link
									key={sub.id}
									href={`/browse?subCategory=${sub.url}`}
									className="group/sub relative flex-1 min-h-0 rounded-xl overflow-hidden bg-muted/40 border border-border/60 block shadow-2xs"
								>
									<Image
										src={sub.image}
										alt={sub.name}
										fill
										sizes="(max-width: 768px) 50vw, 200px"
										className="object-cover group-hover/sub:scale-105 transition-transform duration-300"
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-2.5">
										<span className="text-xs font-semibold text-white drop-shadow-xs truncate block">
											{sub.name}
										</span>
									</div>
								</Link>
							))}
						</div>
					</div>
				)}

				{/* Case 4: 4 or more subcategories - 2x2 grid */}
				{count >= 4 && (
					<div className="grid grid-cols-2 grid-rows-2 gap-2.5 h-full w-full">
						{subs.slice(0, 4).map((sub) => (
							<Link
								key={sub.id}
								href={`/browse?subCategory=${sub.url}`}
								className="group/sub relative w-full h-full rounded-xl overflow-hidden bg-muted/40 border border-border/60 block shadow-2xs"
							>
								<Image
									src={sub.image}
									alt={sub.name}
									fill
									sizes="(max-width: 768px) 50vw, 200px"
									className="object-cover group-hover/sub:scale-105 transition-transform duration-300"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-2.5">
									<span className="text-xs font-semibold text-white drop-shadow-xs truncate block">
										{sub.name}
									</span>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
