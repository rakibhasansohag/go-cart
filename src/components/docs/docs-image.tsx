import React from 'react';
import Image from 'next/image';
import { DocImage } from '@/lib/docs/docs-data';

interface DocsImageProps {
	image: DocImage;
}

export function DocsImage({ image }: DocsImageProps) {
	return (
		<figure className='my-8 overflow-hidden rounded-xl border border-border/80 bg-muted/20 shadow-sm'>
			<div className='relative w-full aspect-[16/9] sm:aspect-[16/10] bg-muted/40'>
				<Image
					src={image.src}
					alt={image.alt}
					fill
					sizes='(max-width: 1024px) 100vw, 800px'
					className='object-cover object-top hover:scale-[1.01] transition-transform duration-300'
				/>
			</div>
			{image.caption && (
				<figcaption className='p-3 text-center text-xs font-medium text-muted-foreground border-t border-border/60 bg-muted/10'>
					{image.caption}
				</figcaption>
			)}
		</figure>
	);
}
