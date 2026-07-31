'use client';

import Image from 'next/image';
import {
	CldUploadWidget,
	type CloudinaryUploadWidgetResults,
} from 'next-cloudinary';
import { FileText, ImagePlus, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReturnEvidenceInput } from '@/queries/returns';

type EvidenceUploadProps = {
	value: ReturnEvidenceInput[];
	onChange: (value: ReturnEvidenceInput[]) => void;
	disabled?: boolean;
};

export default function EvidenceUpload({
	value,
	onChange,
	disabled,
}: EvidenceUploadProps) {
	const onUpload = (result: CloudinaryUploadWidgetResults) => {
		if (!result.info || typeof result.info === 'string') return;

		const type =
			result.info.resource_type === 'video'
				? ('VIDEO' as const)
				: result.info.format === 'pdf' || result.info.resource_type === 'raw'
					? ('DOCUMENT' as const)
					: ('IMAGE' as const);

		onChange([
			...value,
			{
				type,
				url: result.info.secure_url,
				alt: `Return evidence ${value.length + 1}`,
			},
		].slice(0, 5));
	};

	return (
		<div className='space-y-3'>
			<div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
				{value.map((file, index) => (
					<div
						key={file.url}
						className='relative min-h-28 overflow-hidden rounded-xl border border-border bg-muted/30'
					>
						{file.type === 'IMAGE' ? (
							<Image
								src={file.url}
								alt={file.alt || `Return evidence ${index + 1}`}
								fill
								className='object-cover'
								sizes='(max-width: 640px) 50vw, 180px'
							/>
						) : (
							<div className='flex h-28 flex-col items-center justify-center gap-2 text-muted-foreground'>
								{file.type === 'VIDEO' ? (
									<Video className='size-7' aria-hidden='true' />
								) : (
									<FileText className='size-7' aria-hidden='true' />
								)}
								<span className='text-xs font-medium'>
									{file.type === 'VIDEO' ? 'Video evidence' : 'Document'}
								</span>
							</div>
						)}
						<Button
							type='button'
							size='icon'
							variant='destructive'
							className='absolute right-2 top-2 size-8 rounded-full'
							onClick={() =>
								onChange(value.filter((entry) => entry.url !== file.url))
							}
							disabled={disabled}
							aria-label={`Remove evidence ${index + 1}`}
						>
							<Trash2 className='size-4' aria-hidden='true' />
						</Button>
					</div>
				))}
			</div>

			{value.length < 5 && (
				<CldUploadWidget
					uploadPreset={
						process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET ||
						'go-cart-ecommerce'
					}
					onSuccess={onUpload}
					options={{
						multiple: false,
						resourceType: 'auto',
						clientAllowedFormats: [
							'png',
							'jpg',
							'jpeg',
							'webp',
							'gif',
							'mp4',
							'mov',
							'pdf',
						],
					}}
				>
					{({ open }) => (
						<Button
							type='button'
							variant='outline'
							onClick={() => open()}
							disabled={disabled}
							className='w-full sm:w-auto'
						>
							<ImagePlus className='size-4' aria-hidden='true' />
							Add evidence
						</Button>
					)}
				</CldUploadWidget>
			)}
			<p className='text-xs leading-5 text-muted-foreground'>
				Attach up to five images, videos, or PDF documents. Do not include
				payment card details or other sensitive information.
			</p>
		</div>
	);
}
