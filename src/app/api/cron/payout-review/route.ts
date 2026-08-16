import { createWeeklyPayoutReview } from '@/lib/settlement/payout-review';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: Request) {
	const secret = process.env.CRON_SECRET;
	const authorization = request.headers.get('authorization');
	if (!secret || !authorization?.startsWith('Bearer ')) return false;
	const supplied = Buffer.from(authorization.slice('Bearer '.length));
	const expected = Buffer.from(secret);
	return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function handle(request: Request) {
	if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
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
