import { createWeeklyPayoutReview } from '@/lib/settlement/payout-review';
import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/security/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle(request: Request) {
	if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
	try {
		return NextResponse.json({ ok: true, ...(await createWeeklyPayoutReview()) });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Payout review job failed.';
		console.error('Payout review job failed:', message);
		return NextResponse.json({ ok: false, error: message }, { status: 500 });
	}
}

export const GET = handle;
export const POST = handle;
