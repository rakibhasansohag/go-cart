import Image from "next/image";
import { Button } from '../components/ui/button';
import ThemeToggle from '../components/shared/theme-toggle';

export default function Home() {
	return (
		<div>
			<nav className='flex my-10'>
				<ThemeToggle />
			</nav>
			<h1 className='text-3xl text-bold text-red-500 underline font-barlowFont'>
				Hello Go Cart{' '}
			</h1>

			<Button variant={'default'} className='font-barlowFont mt-2'>
				Click Me
			</Button>
		</div>
	);
}
