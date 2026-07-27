'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { MoonIcon, SunIcon, Laptop } from 'lucide-react';
import { useTheme } from 'next-themes';

function ThemeToggle() {
	const { setTheme, theme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// Avoid hydration mismatch
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<Button
				variant='outline'
				size='icon'
				className='w-9 h-9 rounded-full bg-background/80 border border-border/60'
			>
				<div className='w-[1.2rem] h-[1.2rem]' />
			</Button>
		);
	}

	const handleToggle = () => {
		const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
		setTheme(nextTheme);
	};

	return (
		<Button
			variant='outline'
			size='icon'
			className='w-9 h-9 rounded-full relative overflow-hidden flex items-center justify-center bg-background/90 hover:bg-background border border-border/60 shadow-xs cursor-pointer transition-all shrink-0'
			onClick={handleToggle}
			title={`Current theme: ${theme} (click to switch)`}
		>
			<SunIcon className={`h-[1.2rem] w-[1.2rem] text-amber-500 transition-all duration-300 ease-in-out absolute ${theme === 'light' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`} />
			<MoonIcon className={`h-[1.2rem] w-[1.2rem] text-indigo-400 transition-all duration-300 ease-in-out absolute ${theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`} />
			<Laptop className={`h-[1.2rem] w-[1.2rem] text-sky-500 transition-all duration-300 ease-in-out absolute ${theme === 'system' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-180 opacity-0'}`} />
			<span className='sr-only'>Toggle theme</span>
		</Button>
	);
}

export default ThemeToggle;
