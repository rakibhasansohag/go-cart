import { getCommissionSettings, listPayoutBatches, listSettlementOperations } from '@/lib/settlement/service';
import SettlementsTable from './settlements-table';

export default async function AdminSettlementsPage() {
	const [settlements, batches, settings] = await Promise.all([listSettlementOperations(), listPayoutBatches(), getCommissionSettings()]);
	return <SettlementsTable initialSettlements={settlements} initialBatches={batches} payoutHoldDays={settings.payoutHoldDays} />;
}
