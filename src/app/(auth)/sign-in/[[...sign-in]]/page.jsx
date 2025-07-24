import React from 'react';
import { SignIn } from '@clerk/nextjs';

function SingInPage() {
	return (
		<div className='h-screen w-full grid place-content-center'>
			<SignIn />
		</div>
	);
}

export default SingInPage;
