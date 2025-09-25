'use client';

import React, { useEffect, useState } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

function ThemeToggle() {
	const { setTheme, theme, resolvedTheme } = useTheme();
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

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant={'outline'}
					size={'icon'}
					className='w-10 h-10 rounded-full relative'
					title={`Current: ${theme} (${resolvedTheme})`} // Debug info
				>
					<SunIcon className='h-[1.4rem] w-[1.4rem] rotate-0 scale-100 transition-all duration-300 ease-in-out dark:-rotate-90 dark:scale-0' />
					<MoonIcon className='absolute h-[1.4rem] w-[1.4rem] rotate-90 scale-0 transition-all duration-300 ease-in-out dark:rotate-0 dark:scale-100' />
					<span className='sr-only'>Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuItem onClick={() => setTheme('light')}>
					Light {theme === 'light' && '✓'}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme('dark')}>
					Dark {theme === 'dark' && '✓'}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme('system')}>
					System {theme === 'system' && '✓'}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export default ThemeToggle;
