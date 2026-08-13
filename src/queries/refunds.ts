'use server';

import { auth } from '@clerk/nextjs/server';
import { issueReturnRefundForAdmin } from '@/lib/payments/refund';

export async function issueReturnRefund(returnRequestId: string) {
	const { userId } = await auth();
	if (!userId) throw new Error('Please sign in to issue a refund.');
	return issueReturnRefundForAdmin(returnRequestId, userId);
}
