import Image from "next/image";
import { Button } from '../components/ui/button';

export default function Home() {
	return (
		<div>
			<h1 className='text-3xl text-bold text-red-500 underline font-barlowFont'>
				Hello Go Cart{' '}
			</h1>

			<Button variant={'default'} className='font-barlowFont mt-2'>
				Click Me
			</Button>
		</div>
	);
}
