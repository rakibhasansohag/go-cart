'use client';

import { useEffect } from 'react';
import { SignedOut, useUser, SignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { DemoAccountCard } from '@/components/shared/demo-account-card';

export default function SignInPage() {
	const { isLoaded, isSignedIn } = useUser();
	const router = useRouter();
	useEffect(() => {
		if (isLoaded && isSignedIn) router.replace(process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/');
	}, [isLoaded, isSignedIn, router]);
	return (
		<div className='min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 py-8'>
			<div className='w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8'>
				<div className='w-full lg:w-auto flex justify-center'>
					<SignedOut><SignIn path='/sign-in' routing='path' signUpUrl='/sign-up' /></SignedOut>
				</div>
				<div className='w-full max-w-md'><DemoAccountCard /></div>
			</div>
		</div>
	);
}
