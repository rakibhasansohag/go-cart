'use client';
import { useEffect } from 'react';
import { SignedOut, useUser, SignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
	const { isLoaded, isSignedIn } = useUser();
	const router = useRouter();

	useEffect(() => {
		if (!isLoaded) return;
		if (isSignedIn) {
			router.replace(process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/');
		}
	}, [isLoaded, isSignedIn, router]);

	return (
		<div className='h-screen grid place-content-center'>
			<SignedOut>
				<SignIn path='/sign-in' routing='path' signUpUrl='/sign-up' />
			</SignedOut>
		</div>
	);
}
