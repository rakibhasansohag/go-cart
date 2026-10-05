'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Shield, Store, User } from 'lucide-react';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';

const icons = { Customer: User, Seller: Store, Admin: Shield };

export function DemoAccountCard({ layout = 'stacked' }: { layout?: 'stacked' | 'grid' }) {
	const [copied, setCopied] = useState<string | null>(null);
	const [message, setMessage] = useState('');
	async function copy(value: string, key: string, label: string) {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(key);
			setMessage(`${label} copied.`);
		} catch {
			setMessage('Could not copy. Select the email or password text instead.');
		}
	}

	return (
		<div className='w-full rounded-2xl border border-border bg-card p-5 sm:p-6'>
			<h2 className='text-lg font-semibold text-foreground'>Try a demo account</h2>
			<p className='mt-1 text-sm leading-relaxed text-muted-foreground'>
				Choose a role, copy its email and password, then <Link href='/sign-in' className='font-medium text-emerald-600 dark:text-emerald-400 hover:underline'>sign in</Link>.
				{' '}These accounts are shared by people exploring the demo.
			</p>
			<div className={`mt-4 grid gap-4 ${layout === 'grid' ? 'xl:grid-cols-3' : ''}`}>
				{DEMO_ACCOUNTS.map(account => {
					const Icon = icons[account.role];
					return (
						<div key={account.role} className='min-w-0 rounded-xl border border-border bg-muted/30 p-4'>
							<h3 className='flex items-center gap-2 font-semibold text-foreground'><Icon className='h-4 w-4' />{account.role}</h3>
							<p className='mt-2 text-sm leading-relaxed text-muted-foreground'>{account.description}</p>
							<div className='mt-3 space-y-2'>
								{([{ label: 'Email', value: account.email }, { label: 'Password', value: account.password }] as const).map(field => {
									const key = `${account.role}-${field.label}`;
									return (
										<div key={field.label}>
											<p className='mb-1 text-xs text-muted-foreground'>{field.label}</p>
											<div className='flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2'>
												<code className='min-w-0 flex-1 break-all text-xs text-foreground'>{field.value}</code>
												<button type='button' aria-label={`Copy ${account.role.toLowerCase()} ${field.label.toLowerCase()}`} title={`Copy ${field.label.toLowerCase()}`}
													onClick={() => copy(field.value, key, `${account.role} ${field.label.toLowerCase()}`)}
													className='shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'>
													{copied === key ? <Check className='h-4 w-4 text-emerald-600' /> : <Copy className='h-4 w-4' />}
												</button>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
			<p role='status' aria-live='polite' className='mt-3 min-h-5 text-xs text-muted-foreground'>{message || 'To try another role, sign out first, then sign in with that account.'}</p>
		</div>
	);
}
