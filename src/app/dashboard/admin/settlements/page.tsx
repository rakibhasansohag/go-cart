import { listPayoutBatches, listSettlementOperations } from '@/lib/settlement/service';
import SettlementsTable from './settlements-table';

export default async function AdminSettlementsPage() {
	const [settlements, batches] = await Promise.all([listSettlementOperations(), listPayoutBatches()]);
	return <SettlementsTable initialSettlements={settlements} initialBatches={batches} />;
}
