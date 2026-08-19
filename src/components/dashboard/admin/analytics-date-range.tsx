'use client';

import { CalendarIcon, ChevronDownIcon } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function parseInputDate(value?: string) {
	if (!value) return undefined;
	const parsed = parseISO(value);
	return isValid(parsed) ? parsed : undefined;
}

function inputValue(date?: Date) {
	return date ? format(date, 'yyyy-MM-dd') : '';
}

function displayValue(date?: Date) {
	return date ? format(date, 'MMM d, yyyy') : 'Choose date';
}

export function AnalyticsDateRange({ from, to, prefix = 'analytics' }: { from?: string; to?: string; prefix?: string }) {
	const [fromDate, setFromDate] = useState(() => parseInputDate(from));
	const [toDate, setToDate] = useState(() => parseInputDate(to));
	const [openPicker, setOpenPicker] = useState<'from' | 'to' | null>(null);

	return <div className='flex flex-wrap items-end gap-2'>
		<input type='hidden' name='from' value={inputValue(fromDate)} />
		<input type='hidden' name='to' value={inputValue(toDate)} />
		<div className='space-y-1'>
			<label className='block text-xs font-medium' htmlFor={`${prefix}-from-date`}>From</label>
			<Popover open={openPicker === 'from'} onOpenChange={(open) => setOpenPicker(open ? 'from' : null)}>
				<PopoverTrigger asChild>
					<Button id={`${prefix}-from-date`} type='button' variant='outline' className='w-[156px] justify-between font-normal'>
						<span className='flex items-center gap-2'><CalendarIcon className='size-4 text-muted-foreground' />{displayValue(fromDate)}</span>
						<ChevronDownIcon className='size-4 text-muted-foreground' />
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-auto p-0' align='start'>
					<Calendar mode='single' selected={fromDate} onSelect={(date) => { setFromDate(date); setOpenPicker(null); }} initialFocus />
				</PopoverContent>
			</Popover>
		</div>
		<div className='space-y-1'>
			<label className='block text-xs font-medium' htmlFor={`${prefix}-to-date`}>To</label>
			<Popover open={openPicker === 'to'} onOpenChange={(open) => setOpenPicker(open ? 'to' : null)}>
				<PopoverTrigger asChild>
					<Button id={`${prefix}-to-date`} type='button' variant='outline' className='w-[156px] justify-between font-normal'>
						<span className='flex items-center gap-2'><CalendarIcon className='size-4 text-muted-foreground' />{displayValue(toDate)}</span>
						<ChevronDownIcon className='size-4 text-muted-foreground' />
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-auto p-0' align='start'>
					<Calendar mode='single' selected={toDate} onSelect={(date) => { setToDate(date); setOpenPicker(null); }} initialFocus />
				</PopoverContent>
			</Popover>
		</div>
		<Button type='submit'>Apply range</Button>
	</div>;
}
