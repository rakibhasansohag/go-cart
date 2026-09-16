'use client';

import { useEffect, useState } from 'react';
import { SignedOut, useUser, SignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Check, Copy, Shield, Store, User } from 'lucide-react';

const TEST_ACCOUNTS = [
	{
		role: 'Customer',
		email: 'user@email.com',
		password: '123456789',
		description: 'Storefront browsing, shopping cart, checkout, returns & reviews',
		icon: User,
		badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
	},
	{
		role: 'Seller',
		email: 'seller@email.com',
		password: '123456789',
		description: 'Storefront studio, catalog & inventory, orders & Stripe Connect payouts',
		icon: Store,
		badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
	},
	{
		role: 'Admin',
		email: 'admin@email.com',
		password: '123456789',
		description: 'Platform overview, seller verification, settlement ledger & moderation',
		icon: Shield,
		badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
	},
];

export default function SignInPage() {
	const { isLoaded, isSignedIn } = useUser();
	const router = useRouter();
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	useEffect(() => {
		if (!isLoaded) return;
		if (isSignedIn) {
			router.replace(process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/');
		}
	}, [isLoaded, isSignedIn, router]);

	const handleCopy = async (text: string, key: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedKey(key);
			setTimeout(() => {
				setCopiedKey((curr) => (curr === key ? null : curr));
			}, 2000);
		} catch {
			// Fallback silently if clipboard unavailable
		}
	};

	return (
		<div className='min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 py-8'>
			<div className='w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8'>
				{/* Clerk SignIn Form */}
				<div className='w-full lg:w-auto flex justify-center'>
					<SignedOut>
						<SignIn path='/sign-in' routing='path' signUpUrl='/sign-up' />
					</SignedOut>
				</div>

				{/* Quick Test Accounts Card */}
				<div className='w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm'>
					<div className='flex items-center gap-2 mb-1'>
						<div className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
						<h2 className='text-lg font-semibold text-slate-900 dark:text-slate-100'>
							Demo Test Accounts
						</h2>
					</div>
					<p className='text-xs text-slate-500 dark:text-slate-400 mb-5'>
						Use any of these pre-configured accounts to explore different roles.
					</p>

					<div className='space-y-4'>
						{TEST_ACCOUNTS.map((account) => {
							const IconComponent = account.icon;
							const isEmailCopied = copiedKey === `${account.role}-email`;
							const isPassCopied = copiedKey === `${account.role}-pass`;

							return (
								<div
									key={account.role}
									className='p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors'
								>
									<div className='flex items-center justify-between mb-1.5'>
										<div className='flex items-center gap-2'>
											<IconComponent className='w-4 h-4 text-slate-600 dark:text-slate-300' />
											<span className='font-medium text-sm text-slate-800 dark:text-slate-200'>
												{account.role}
											</span>
										</div>
										<span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${account.badgeColor}`}>
											{account.role} Role
										</span>
									</div>

									<p className='text-[11px] text-slate-500 dark:text-slate-400 mb-2.5 leading-relaxed'>
										{account.description}
									</p>

									<div className='flex items-center gap-2 text-xs'>
										{/* Email copy */}
										<button
											type='button'
											onClick={() => handleCopy(account.email, `${account.role}-email`)}
											className='flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition'
											title='Click to copy email'
										>
											<span className='truncate mr-1'>{account.email}</span>
											{isEmailCopied ? (
												<Check className='w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0' />
											) : (
												<Copy className='w-3.5 h-3.5 text-slate-400 shrink-0' />
											)}
										</button>

										{/* Password copy */}
										<button
											type='button'
											onClick={() => handleCopy(account.password, `${account.role}-pass`)}
											className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition'
											title='Click to copy password'
										>
											<span>{account.password}</span>
											{isPassCopied ? (
												<Check className='w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0' />
											) : (
												<Copy className='w-3.5 h-3.5 text-slate-400 shrink-0' />
											)}
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
