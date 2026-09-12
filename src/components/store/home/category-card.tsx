import { FeaturedCategoryType } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CategoryCard({
	category,
}: {
	category: FeaturedCategoryType;
}) {
	return (
		<div className="w-full h-full rounded-2xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
			<Link
				href={`/browse?category=${category.url}`}
				className="px-4 pt-3.5 pb-2 flex items-center justify-between group/title"
			>
				<span className="text-base sm:text-lg text-foreground font-extrabold line-clamp-1 tracking-tight group-hover/title:text-primary transition-colors">
					{category.name}
				</span>
				<span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover/title:text-primary transition-colors">
					<span>View all</span>
					<ArrowRight className="size-3 transition-transform group-hover/title:translate-x-0.5" />
				</span>
			</Link>
			<div className="flex gap-2.5 p-3.5 pt-1">
				{category.subCategories.map((sub) => (
					<Link
						key={sub.id}
						href={`/browse?subCategory=${sub.url}`}
						className="group/sub relative flex-1 min-w-0 rounded-xl overflow-hidden bg-muted/40 border border-border/60 aspect-[4/3] block shadow-2xs"
					>
						<Image
							src={sub.image}
							alt={sub.name}
							fill
							sizes="(max-width: 768px) 50vw, 200px"
							className="object-cover group-hover/sub:scale-105 transition-transform duration-300"
						/>
						<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-2 pt-4">
							<span className="text-[11px] font-semibold text-white truncate block drop-shadow-xs">
								{sub.name}
							</span>
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
