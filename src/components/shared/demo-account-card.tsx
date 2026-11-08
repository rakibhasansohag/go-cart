'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, LoaderCircle, Shield, Store, User } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';

type DemoAccount = (typeof DEMO_ACCOUNTS)[number];
type DemoRole = DemoAccount['role'];

const icons = { Customer: User, Seller: Store, Admin: Shield };
const summaries = { Customer: 'Shop and track orders', Seller: 'Manage a store', Admin: 'Oversee the marketplace' };

function LoginDetails({ account }: { account: DemoAccount }) {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState<'Email' | 'Password' | null>(null);
	const [message, setMessage] = useState('');

	return (
		<Dialog open={open} onOpenChange={next => {
			setOpen(next);
			if (!next) { setCopied(null); setMessage(''); }
		}}>
			<DialogTrigger asChild>
				<button type='button' aria-label={`View ${account.role.toLowerCase()} login details`} className='min-h-11 shrink-0 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:px-3'>
					Login details
				</button>
			</DialogTrigger>
			<DialogContent className='gap-5 rounded-xl motion-reduce:animate-none sm:max-w-sm'>
				<DialogHeader>
					<DialogTitle>{account.role} demo login</DialogTitle>
					<DialogDescription>Use these shared details to sign in manually.</DialogDescription>
				</DialogHeader>
				<dl className='grid gap-3'>
					{([{ label: 'Email', value: account.email }, { label: 'Password', value: account.password }] as const).map(({ label, value }) => (
						<div key={label} className='grid gap-1.5'>
							<dt className='text-xs font-medium text-muted-foreground'>{label}</dt>
							<dd className='flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-muted/35 pl-3'>
								<code className='min-w-0 select-all break-all text-sm text-foreground'>{value}</code>
								<button type='button' aria-label={`Copy ${label.toLowerCase()}`} onClick={async () => {
									try {
										await navigator.clipboard.writeText(value);
										setCopied(label);
										setMessage(`${label} copied.`);
									} catch {
										setCopied(null);
										setMessage('Could not copy. You can select and copy the text manually.');
									}
								}} className='grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring'>
									{copied === label ? <Check aria-hidden='true' className='size-4' /> : <Copy aria-hidden='true' className='size-4' />}
								</button>
							</dd>
						</div>
					))}
				</dl>
				<p role='status' className='min-h-4 text-xs text-muted-foreground'>{message}</p>
			</DialogContent>
		</Dialog>
	);
}

export function DemoAccountCard({ onSignIn, ready = false, pending = null, error }: {
	onSignIn?: (account: DemoAccount) => void;
	ready?: boolean;
	pending?: DemoRole | null;
	error?: string;
}) {
	return (
		<section id='demo-accounts' aria-label='Try a demo account' className='w-full rounded-2xl border border-border bg-card p-4 sm:p-6'>
			<h2 className='text-xl font-semibold tracking-tight text-foreground'>Try a demo account</h2>
			<p className='mt-1.5 text-sm leading-relaxed text-muted-foreground'>
				{onSignIn ? 'Choose a role to sign in instantly.' : <>Choose a role on the <Link href='/sign-in#demo-accounts' className='font-medium text-foreground underline underline-offset-4'>sign-in page</Link>.</>}
			</p>
			<ul className='mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border'>
				{DEMO_ACCOUNTS.map(account => {
					const Icon = icons[account.role];
					const signingIn = pending === account.role;
					const roleLabel = <><Icon aria-hidden='true' className='size-4 shrink-0 text-muted-foreground' /><span className='min-w-0 flex-1'><span className='block text-sm font-semibold'>{account.role}</span><span className='mt-0.5 block text-xs leading-snug text-muted-foreground'>{signingIn ? 'Signing in…' : summaries[account.role]}</span></span></>;
					return (
						<li key={account.role} className='flex min-w-0 items-center gap-1 px-1.5'>
							{onSignIn ? (
								<button type='button' aria-label={`Sign in as ${account.role.toLowerCase()}`} disabled={!ready || pending !== null} onClick={() => onSignIn(account)} className='my-1 flex min-h-14 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 text-left text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:hover:bg-transparent sm:gap-3 sm:px-3'>
									{roleLabel}
									{signingIn ? <LoaderCircle aria-hidden='true' className='size-4 shrink-0 motion-safe:animate-spin' /> : <ArrowRight aria-hidden='true' className='size-4 shrink-0 text-muted-foreground' />}
								</button>
							) : <div className='flex min-h-16 min-w-0 flex-1 items-center gap-3 px-3 text-foreground'>{roleLabel}</div>}
							<LoginDetails account={account} />
						</li>
					);
				})}
			</ul>
			{pending && <p role='status' className='sr-only'>Signing in as {pending}…</p>}
			{error && <p role='alert' className='mt-3 text-sm text-destructive'>{error}</p>}
			<p className='mt-4 text-xs leading-relaxed text-muted-foreground'>These accounts are shared. Sign out to try another role.</p>
		</section>
	);
}
