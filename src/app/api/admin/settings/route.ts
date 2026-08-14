import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCommissionSettings, updateCommissionPercent } from '@/lib/settlement/service';

const updateSchema = z.object({
	commissionPercent: z.coerce.number().int().min(0).max(100),
});

async function getAdminId() {
	const { userId } = await auth();
	if (!userId) throw new Error('Sign in required.');
	const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
	if (user?.role !== 'ADMIN') throw new Error('Admin access required.');
	return user.id;
}

export async function GET() {
	try {
		await getAdminId();
		return NextResponse.json(await getCommissionSettings());
	} catch (error) {
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load platform settings.' }, { status: 403 });
	}
}

export async function PATCH(request: Request) {
	try {
		const adminId = await getAdminId();
		const input = updateSchema.parse(await request.json());
		const setting = await updateCommissionPercent(input.commissionPercent, adminId);
		return NextResponse.json({ commissionPercent: setting.commissionPercent });
	} catch (error) {
		const status = error instanceof z.ZodError ? 400 : 403;
		return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update platform settings.' }, { status });
	}
}
