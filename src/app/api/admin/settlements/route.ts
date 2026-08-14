import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { approvePayoutBatch, createWeeklyPayoutBatch, listSettlementOperations, processPayoutBatch, retrySettlement } from '@/lib/settlement/service';

async function assertAdmin() {
	const { userId } = await auth();
	if (!userId) throw new Error('Sign in required.');
	const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
	if (user?.role !== 'ADMIN') throw new Error('Admin access required.');
}

export async function GET() {
	try {
		await assertAdmin();
		return NextResponse.json({ settlements: await listSettlementOperations() });
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load settlements.' }, { status: 403 });
	}
}

export async function POST(request: Request) {
	try {
		await assertAdmin();
		const body = await request.json() as { action?: string; batchId?: string; settlementId?: string };
		if (body.action === 'create-batch') return NextResponse.json({ batch: await createWeeklyPayoutBatch() });
		if (body.action === 'approve' && body.batchId) return NextResponse.json({ batch: await approvePayoutBatch(body.batchId) });
		if (body.action === 'process' && body.batchId) return NextResponse.json({ batch: await processPayoutBatch(body.batchId) });
		if (body.action === 'retry' && body.settlementId) return NextResponse.json({ result: await retrySettlement(body.settlementId) });
		return NextResponse.json({ error: 'Unknown settlement action.' }, { status: 400 });
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Settlement action failed.' }, { status: 400 });
	}
}
