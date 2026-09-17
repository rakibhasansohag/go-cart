import { ReactNode } from 'react';
import CheckInModal from '@/components/store/checkin/checkin-modal';
import CheckInTrigger from '@/components/store/checkin/checkin-trigger';

export default function StoreLayout({ children }: { children: ReactNode }) {
	return (
		<div>
			<div>{children}</div>
			<CheckInModal />
			<CheckInTrigger variant='floating' />
		</div>
	);
}
