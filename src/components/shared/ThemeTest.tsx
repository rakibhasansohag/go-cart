'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export default function ThemeTest() {
	const { theme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return (
		<div className='p-8 bg-foreground space-y-6 border-2 border-dashed border-gray-400 m-4'>
			<h2 className='text-xl font-bold'> Theme Debug Info</h2>

			{/* Theme Status */}
			<div className='bg-gray-100 dark:bg-gray-800 p-4 rounded'>
				<p>
					<strong>Current theme:</strong>{' '}
					<span className='font-mono text-blue-500'>{theme}</span>
				</p>
				<p>
					<strong>Resolved theme:</strong>{' '}
					<span className='font-mono text-blue-500'>{resolvedTheme}</span>
				</p>
				<p>
					<strong>HTML class:</strong>{' '}
					<span className='font-mono text-blue-500'>
						{typeof window !== 'undefined'
							? document.documentElement.className || 'none'
							: 'loading'}
					</span>
				</p>
			</div>

			{/* Background Tests */}
			<div className='space-y-4'>
				<h3 className='font-semibold text-lg'>🎨 Background Color Tests</h3>

				{/* Test 1: bg-background class */}
				<div className='bg-background text-foreground p-4 border border-gray-300 dark:border-gray-600'>
					<p>
						<strong>bg-background + text-foreground:</strong>
					</p>
					<p>Should be white bg + dark text in light mode</p>
					<p>Should be dark bg + light text in dark mode</p>
				</div>

				{/* Test 2: Manual background colors */}
				<div className='bg-white dark:bg-gray-900 text-black dark:text-white p-4 border border-gray-300 dark:border-gray-600'>
					<p>
						<strong>bg-white dark:bg-gray-900:</strong>
					</p>
					<p>Manual light/dark background</p>
				</div>

				<div className='space-y-2'>
					<div className='bg-main-primary text-white p-2 rounded'>
						<p>
							bg-main-primary:{' '}
							{resolvedTheme === 'dark'
								? 'Should be #e6e6e6'
								: 'Should be #191919'}
						</p>
					</div>

					<div className='bg-orange-primary text-white p-2 rounded'>
						<p>
							bg-orange-primary:{' '}
							{resolvedTheme === 'dark'
								? 'Should be #ff8a50'
								: 'Should be #FA6338'}
						</p>
					</div>

					<div className='bg-blue-primary text-white p-2 rounded'>
						<p>
							bg-blue-primary:{' '}
							{resolvedTheme === 'dark'
								? 'Should be #69a9ff'
								: 'Should be #0D6EFD'}
						</p>
					</div>
				</div>
			</div>

			{/* Text Color Tests */}
			<div className='space-y-4'>
				<h3 className='font-semibold text-lg'>📝 Text Color Tests</h3>

				<div className='space-y-2 bg-gray-50 dark:bg-gray-800 p-4 rounded'>
					<p className='text-main-primary'>
						text-main-primary (should auto-switch)
					</p>
					<p className='text-orange-primary'>
						text-orange-primary (should auto-switch)
					</p>
					<p className='text-blue-primary'>
						text-blue-primary (should auto-switch)
					</p>
					<p className='text-red-500 dark:text-red-300'>
						text-red-500 dark:text-red-300 (manual override)
					</p>
				</div>
			</div>

			{/* CSS Variables Inspection */}
			<div className='space-y-4'>
				<h3 className='font-semibold text-lg'>🔧 CSS Variables</h3>
				<div className='bg-gray-100 dark:bg-gray-800 p-4 rounded font-mono text-xs space-y-1'>
					<p>
						--color-background: <span id='bg-var'>Loading...</span>
					</p>
					<p>
						--color-foreground: <span id='fg-var'>Loading...</span>
					</p>
					<p>
						--color-main-primary: <span id='main-var'>Loading...</span>
					</p>
				</div>
			</div>

			<script
				dangerouslySetInnerHTML={{
					__html: `
          setTimeout(() => {
            const styles = getComputedStyle(document.documentElement);
            document.getElementById('bg-var').textContent = styles.getPropertyValue('--color-background').trim();
            document.getElementById('fg-var').textContent = styles.getPropertyValue('--color-foreground').trim();
            document.getElementById('main-var').textContent = styles.getPropertyValue('--color-main-primary').trim();
          }, 100);
        `,
				}}
			/>
		</div>
	);
}
