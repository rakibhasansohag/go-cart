import Link from 'next/link';
import { Undo2 } from 'lucide-react';

export default function ReturnLink({ orderItemId }: { orderItemId: string }) {
	return (
		<Link
			href={`/profile/returns/new?itemId=${encodeURIComponent(orderItemId)}`}
			className='inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
		>
			<Undo2 className='size-3.5' aria-hidden='true' />
			Request return
		</Link>
	);
}
