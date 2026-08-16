import { getCommissionSettings, listPayoutBatches, listSettlementOperations } from '@/lib/settlement/service';
import SettlementsTable from './settlements-table';

export default async function AdminSettlementsPage({
	searchParams,
}: {
	searchParams: Promise<{ batchId?: string }>;
}) {
	const [settlements, batches, settings] = await Promise.all([listSettlementOperations(), listPayoutBatches(), getCommissionSettings()]);
	const { batchId } = await searchParams;
	const selectedBatchId = typeof batchId === 'string' && batches.some((batch) => batch.id === batchId)
		? batchId
		: undefined;
	return <SettlementsTable initialSettlements={settlements} initialBatches={batches} payoutHoldDays={settings.payoutHoldDays} selectedBatchId={selectedBatchId} />;
}
