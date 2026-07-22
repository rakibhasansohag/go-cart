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
				variant={'outline'}
				size={'icon'}
				className='w-10 h-10 rounded-full'
			>
				<div className='w-[1.4rem] h-[1.4rem]' />
			</Button>
		);
	}

	const handleToggle = () => {
		const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
		setTheme(nextTheme);
	};

	return (
		<Button
			variant={'outline'}
			size={'icon'}
			className='w-10 h-10 rounded-full relative overflow-hidden flex items-center justify-center'
			onClick={handleToggle}
			title={`Theme: ${theme}`}
		>
			<SunIcon className={`h-[1.4rem] w-[1.4rem] transition-all duration-300 ease-in-out absolute ${theme === 'light' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`} />
			<MoonIcon className={`h-[1.4rem] w-[1.4rem] transition-all duration-300 ease-in-out absolute ${theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'}`} />
			<Laptop className={`h-[1.4rem] w-[1.4rem] transition-all duration-300 ease-in-out absolute ${theme === 'system' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-180 opacity-0'}`} />
			<span className='sr-only'>Toggle theme</span>
		</Button>
	);
}

export default ThemeToggle;
