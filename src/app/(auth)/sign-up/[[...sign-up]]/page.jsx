export const dynamic = 'force-dynamic';
export const revalidate = 0;

import React from 'react';
import { SignUp } from '@clerk/nextjs';

function SingUpPage() {
	return (
		<div className='h-screen w-full grid place-content-center'>
			<SignUp />
		</div>
	);
}

export default SingUpPage;
