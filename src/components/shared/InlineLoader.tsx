'use client';

import React from 'react';

export const InlineLoader: React.FC<{ size?: number; label?: string }> = ({
	size = 18,
	label,
}) => {
	const s = `${size}px`;
	return (
		<span className='inline-flex items-center gap-2'>
			<span
				className='inline-block rounded-full border-2 border-gray-200 border-t-emerald-500 animate-spin'
				style={{ width: s, height: s }}
				aria-hidden
			/>
			{label ? (
				<span className='text-sm text-muted-foreground'>{label}</span>
			) : null}
		</span>
	);
};

export default InlineLoader;
