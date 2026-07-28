import { SendIcon } from '@/components/store/icons';

export default function Newsletter() {
	return (
		<div className='bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 py-6 px-4 overflow-hidden border-t border-border/20'>
			<div className='max-w-[1430px] mx-auto'>
				<div className='flex flex-col lg:flex-row items-center justify-between gap-4 text-white'>
					{/* Text Section - Perfectly centered on mobile/tablet, aligned on desktop */}
					<div className='flex flex-col sm:flex-row items-center justify-center lg:justify-start text-center sm:text-left gap-2 sm:gap-4 w-full lg:w-auto'>
						<h5 className='flex items-center justify-center gap-x-2 text-base md:text-lg font-extrabold whitespace-nowrap tracking-tight'>
							<SendIcon />
							<span>Sign up to Newsletter</span>
						</h5>
						<p className='text-xs md:text-sm text-slate-300 font-medium'>
							...and receive <b className='text-orange-400 font-extrabold'>$10 coupon for first shopping</b>
						</p>
					</div>

					{/* Input Form Pill - Centered on mobile/tablet, right-aligned on desktop */}
					<div className='w-full sm:max-w-md lg:w-[460px] bg-white p-1.5 rounded-full flex items-center shadow-md shrink-0 border border-white/20 mx-auto lg:mx-0'>
						<input
							type='email'
							placeholder='Enter your email address'
							className='w-full h-9 pl-4 pr-2 text-sm bg-transparent text-slate-900 outline-none placeholder:text-slate-400 border-none focus:outline-none focus:ring-0'
						/>
						<button
							type='button'
							className='h-9 px-6 text-xs font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white cursor-pointer transition-all duration-200 whitespace-nowrap shrink-0 shadow-xs active:scale-95'
						>
							Sign up
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
