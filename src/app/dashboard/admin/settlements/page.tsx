import { getCommissionSettings, listPayoutBatches, listSettlementOperations } from '@/lib/settlement/service';
import SettlementsTable from './settlements-table';

export default async function AdminSettlementsPage({
	searchParams,
}: {
	searchParams: Promise<{ batchId?: string; batchPage?: string; settlementPage?: string }>;
}) {
	const { batchId, batchPage, settlementPage } = await searchParams;
	const [settlements, batches, settings] = await Promise.all([
		listSettlementOperations({ page: Number(settlementPage) }),
		listPayoutBatches({ page: Number(batchPage) }),
		getCommissionSettings(),
	]);
	const selectedBatchId = typeof batchId === 'string' && batches.items.some((batch) => batch.id === batchId)
		? batchId
		: undefined;
	return <SettlementsTable initialSettlements={settlements.items} initialBatches={batches.items} settlementPagination={settlements.pagination} batchPagination={batches.pagination} payoutHoldDays={settings.payoutHoldDays} selectedBatchId={selectedBatchId} />;
}
