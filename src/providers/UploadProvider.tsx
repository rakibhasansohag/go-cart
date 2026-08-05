'use client';

import { CldUploadWidget } from 'next-cloudinary';

export default function UploadPreloader() {
	const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET;

	if (!uploadPreset) return null;

	return (
		<div className='hidden'>
			<CldUploadWidget uploadPreset={uploadPreset}>
				{() => <button hidden>preload</button>}
			</CldUploadWidget>
		</div>
	);
}
