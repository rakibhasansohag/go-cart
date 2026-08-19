import { Card, CardContent } from '@/components/ui/card';

export function MetricCard({ label, value, supporting }: { label: string; value: string | number; supporting?: string }) {
	return <Card className='gap-0 py-0 shadow-none'>
		<CardContent className='p-4'>
			<p className='text-xs text-muted-foreground'>{label}</p>
			<p className='mt-1 text-xl font-semibold tracking-tight'>{value}</p>
			{supporting && <p className='mt-1 text-xs text-muted-foreground'>{supporting}</p>}
		</CardContent>
	</Card>;
}
