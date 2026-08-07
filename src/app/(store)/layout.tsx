import { ReactNode } from 'react';
import CheckInModal from '@/components/store/checkin/checkin-modal';

export default function StoreLayout({ children }: { children: ReactNode }) {
	return (
		<div>
			<div>{children}</div>
			<CheckInModal />
		</div>
	);
}
