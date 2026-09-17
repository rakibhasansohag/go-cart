import React from 'react';
import { DocTable } from '@/lib/docs/docs-data';

interface DocsTableProps {
	table: DocTable;
}

export function DocsTable({ table }: DocsTableProps) {
	return (
		<div className='my-6 w-full overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm'>
			<table className='w-full text-left text-sm border-collapse'>
				{table.caption && <caption className='p-3 text-xs text-muted-foreground text-left'>{table.caption}</caption>}
				<thead className='bg-muted/60 border-b border-border text-foreground font-semibold'>
					<tr>
						{table.headers.map((header, idx) => (
							<th key={idx} scope='col' className='px-4 py-3 text-xs font-bold uppercase tracking-wider'>
								{header}
							</th>
						))}
					</tr>
				</thead>
				<tbody className='divide-y divide-border/60 text-muted-foreground'>
					{table.rows.map((row, rowIdx) => (
						<tr key={rowIdx} className='hover:bg-muted/30 transition-colors'>
							{row.map((cell, cellIdx) => (
								<td key={cellIdx} className='px-4 py-3.5 leading-relaxed align-top first:font-medium first:text-foreground'>
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
