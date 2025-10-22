'use client';

import React from 'react';
import { Dot,  Info } from 'lucide-react';
import { motion } from 'framer-motion';

import {
	Sheet,
	SheetContent,
	SheetTrigger,
	SheetTitle,
} from '@/components/ui/sheet';

export default function Instructions() {
	return (
		<>
			<aside
				className='
          hidden lg:block
          max-h-[calc(100vh-64px)]
          overflow-y-auto
          bg-teal-100 dark:bg-teal-950
          border-t-4 border-teal-500
          text-teal-900 dark:text-teal-200
          px-4 py-4 shadow-md
          sticky top-[64px]
        '
			>
				<div className='flex gap-3'>
					<div className='me-1'>
						<Info className='stroke-teal-500' />
					</div>

					<div className='flex-1'>
						<p className='font-bold'>Instructions</p>

						<div className='mt-3 space-y-3 pr-2'>
							{instructions.map((inst, index) => (
								<div key={index} className='flex gap-x-2 items-start'>
									<Dot className='mt-1 w-4 text-teal-500' />
									<p className='text-sm leading-tight'>{inst.info}</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</aside>

			<div className='lg:hidden'>
				<Sheet>
					<div className='fixed right-4 bottom-20 z-[60]'>
						<SheetTrigger asChild>
							<button
								aria-label='Open instructions'
								title='Instructions'
								className='inline-flex items-center justify-center rounded-full p-3 bg-white/95 dark:bg-slate-800 shadow-lg border'
							>
								<Info className='h-5 w-5 text-teal-600' />
							</button>
						</SheetTrigger>
					</div>

					<SheetContent side='bottom' className='p-0'>
						
						<motion.div
							initial={{ translateY: 24, opacity: 0 }}
							animate={{ translateY: 0, opacity: 1 }}
							transition={{ duration: 0.28, ease: 'easeOut' }}
							className='rounded-t-lg bg-white dark:bg-slate-900 shadow-xl max-h-[80vh] flex flex-col'
						>
							<SheetTitle className='px-4 py-4 border-b border-gray-100 dark:border-slate-700'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-3'>
										<Info className='text-teal-600' />
										<h3 className='text-lg font-semibold'>Instructions</h3>
									</div>
									{/* <SheetClose asChild>
										<button className='text-sm opacity-80'>Close</button>
									</SheetClose> */}
								</div>
							</SheetTitle>

							<div
								className='px-4 py-3 overflow-y-auto'
								style={{ maxHeight: 'calc(80vh - 64px)' }}
							>
								<div className='space-y-3'>
									{instructions.map((inst, index) => (
										<div key={index} className='flex gap-x-2'>
											<Dot className='mt-1 w-4 text-teal-500' />
											<p className='text-sm leading-tight'>{inst.info}</p>
										</div>
									))}

									<div className='h-6' />
								</div>
							</div>
						</motion.div>
					</SheetContent>
				</Sheet>
			</div>
		</>
	);
}

const instructions = [
	{
		info: 'Use your real photo as the profile picture. To update, click on the image, then select "Manage Account."',
	},
	{
		info: 'Make sure your first and last name are your real names to ensure they get approved.',
	},
	{
		info: 'Ensure your email address is correct. This is how we will contact you for important updates.',
	},
	{
		info: 'Provide a valid phone number so customers can reach you if necessary.',
	},
	{
		info: 'Set up your store logo and cover photo to make your store more attractive to customers.',
	},
	{
		info: 'Specify default shipping details like service, fees, and delivery time to streamline orders.',
	},
	{ info: 'Include a clear return policy to build trust and avoid disputes.' },
	{
		info: "Double-check your store's URL to ensure it's working and easy for customers to find.",
	},
	{
		info: 'Enter a detailed store description that highlights your offerings and what sets your store apart.',
	},
	{
		info: 'Fill in the default shipping fee fields carefully to avoid discrepancies during order processing.',
	},
	{
		info: 'Provide a realistic delivery time range to set clear expectations for your customers.',
	},
	{
		info: 'Review all details before submitting to ensure everything is accurate and complete for approval.',
	},
];
