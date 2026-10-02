'use client';

import NextImage, { type ImageProps } from 'next/image';
import { useState } from 'react';
import { catalogImageSource, catalogImageFallback } from '@/lib/catalog-image';

export default function CatalogImage({ src, onError, ...props }: ImageProps) {
	const [failedSource, setFailedSource] = useState<ImageProps['src'] | null>(null);
	const normalized = typeof src === 'string' ? catalogImageSource(src) : src;
	return <NextImage {...props} src={failedSource === src ? catalogImageFallback : normalized}
		onError={(event) => { setFailedSource(src); onError?.(event); }} />;
}
