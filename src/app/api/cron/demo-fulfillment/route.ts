import { runDemoFulfillment } from '@/lib/orders/demo-automation';
import { NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/security/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle(request: Request) {
	if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
	const manual = new URL(request.url).searchParams.get('manual') === '1';
	try { return NextResponse.json({ ok: true, ...(await runDemoFulfillment({ manual })) }); }
	catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Automation failed.' }, { status: 500 }); }
}

export async function GET(request: Request) {
	return handle(request);
}

export async function POST(request: Request) {
	return handle(request);
}

export async function HEAD(request: Request) {
	const res = await handle(request);
	return new Response(null, {
		status: res.status,
		headers: res.headers,
	});
}
