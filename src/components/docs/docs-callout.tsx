import React from 'react';
import { DocCallout } from '@/lib/docs/docs-data';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface DocsCalloutProps {
	callout: DocCallout;
}

export function DocsCallout({ callout }: DocsCalloutProps) {
	const getCalloutStyles = () => {
		switch (callout.type) {
			case 'tip':
				return {
					container: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200',
					icon: <CheckCircle2 className='w-5 h-5 text-emerald-500 shrink-0 mt-0.5' />,
					badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
					label: 'Tip',
				};
			case 'note':
				return {
					container: 'bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200',
					icon: <Info className='w-5 h-5 text-blue-500 shrink-0 mt-0.5' />,
					badge: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
					label: 'Note',
				};
			case 'important':
				return {
					container: 'bg-purple-500/10 border-purple-500/30 text-purple-950 dark:text-purple-200',
					icon: <AlertCircle className='w-5 h-5 text-purple-500 shrink-0 mt-0.5' />,
					badge: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
					label: 'Important',
				};
			case 'warning':
				return {
					container: 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200',
					icon: <AlertTriangle className='w-5 h-5 text-amber-500 shrink-0 mt-0.5' />,
					badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
					label: 'Warning',
				};
			default:
				return {
					container: 'bg-muted border-border text-foreground',
					icon: <Info className='w-5 h-5 text-muted-foreground shrink-0 mt-0.5' />,
					badge: 'bg-muted-foreground/20 text-muted-foreground',
					label: 'Notice',
				};
		}
	};

	const style = getCalloutStyles();

	return (
		<aside className={`my-6 p-4 rounded-xl border flex items-start gap-3.5 text-sm leading-relaxed ${style.container}`}>
			{style.icon}
			<div className='flex-1'>
				<div className='flex items-center gap-2 mb-1.5'>
					<span className={`text-xs font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${style.badge}`}>
						{callout.title || style.label}
					</span>
				</div>
				<p className='opacity-90'>{callout.content}</p>
			</div>
		</aside>
	);
}
