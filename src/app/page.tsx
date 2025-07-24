import { Button } from '../components/ui/button';
import ThemeToggle from '../components/shared/theme-toggle';
import { UserButton } from '@clerk/nextjs';

export default function Home() {
	return (
		<div>
			<nav className='flex items-center py-10 gap-x-5 justify-end'>
				<UserButton />
				<ThemeToggle />
			</nav>
			<h1 className='text-3xl text-bold text-red-500 underline font-barlowFont'>
				Hello Go Cart{' '}
			</h1>
		</div>
	);
}
