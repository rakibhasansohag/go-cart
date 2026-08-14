'use client';

import { FormEvent, useState } from 'react';

export default function PlatformSettingsForm({ initialCommissionPercent }: { initialCommissionPercent: number }) {
	const [commissionPercent, setCommissionPercent] = useState(String(initialCommissionPercent));
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMessage('');
		setError('');
		setSaving(true);
		try {
			const response = await fetch('/api/admin/settings', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ commissionPercent }),
			});
			const data = await response.json() as { commissionPercent?: number; error?: string };
			if (!response.ok) throw new Error(data.error ?? 'Unable to save commission.');
			setCommissionPercent(String(data.commissionPercent));
			setMessage(`Saved. New settlements will use ${data.commissionPercent}% commission.`);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : 'Unable to save commission.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className='mx-auto flex w-full max-w-3xl flex-col gap-6'>
			<header className='border-b border-border/60 pb-4'>
				<h1 className='text-2xl font-bold tracking-tight'>Marketplace settings</h1>
				<p className='mt-1 text-sm text-muted-foreground'>Control how GoCart calculates its marketplace commission before seller payday.</p>
			</header>
			<section className='rounded-xl border border-border p-5'>
				<h2 className='text-lg font-semibold'>GoCart commission</h2>
				<p className='mt-1 text-sm text-muted-foreground'>This applies only when a new settlement ledger entry is created. Existing settlements keep the percentage recorded when they were created.</p>
				<form onSubmit={submit} className='mt-6 space-y-4'>
					<label htmlFor='commission-percent' className='block text-sm font-medium'>Commission percentage</label>
					<div className='flex max-w-xs items-center gap-2'>
						<input id='commission-percent' name='commissionPercent' type='number' min='0' max='100' step='1' required value={commissionPercent} onChange={(event) => setCommissionPercent(event.target.value)} className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary' />
						<span className='text-sm text-muted-foreground'>%</span>
					</div>
					<p className='text-xs text-muted-foreground'>Allowed range: 0% to 100%. The default for a fresh database is 2%.</p>
					{message && <p role='status' className='rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700'>{message}</p>}
					{error && <p role='alert' className='rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'>{error}</p>}
					<button type='submit' disabled={saving} className='rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50'>{saving ? 'Saving…' : 'Save commission'}</button>
				</form>
			</section>
		</div>
	);
}
