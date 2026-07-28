import { SendIcon } from '@/components/store/icons';

export default function Newsletter() {
	return (
		<div className='bg-gradient-to-r from-slate-500 to-slate-800 py-6 px-4 overflow-hidden'>
			<div className='max-w-[1430px] mx-auto'>
				<div className='flex flex-col xl:flex-row items-center justify-between gap-4 text-white'>
					{/* Left Title & Coupon Offer */}
					<div className='flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 sm:gap-6 w-full xl:w-auto'>
						<h5 className='flex items-center gap-x-2 text-base md:text-xl font-bold whitespace-nowrap'>
							<SendIcon />
							<span>Sign up to Newsletter</span>
						</h5>
						<p className='text-xs md:text-sm text-slate-200'>
							...and receive <b className='text-white font-bold'>$10 coupon for first shopping</b>
						</p>
					</div>

					{/* Right Input Form */}
					<div className='flex w-full sm:max-w-md xl:w-[450px] shrink-0'>
						<input
							type='email'
							placeholder='Enter your email address'
							className='w-full h-11 pl-5 text-sm bg-white text-slate-900 rounded-l-full outline-none placeholder:text-slate-400 border-none'
						/>
						<button
							type='button'
							className='h-11 px-6 text-sm font-semibold rounded-r-full bg-slate-700 hover:bg-slate-800 text-white cursor-pointer transition-colors whitespace-nowrap shrink-0 border-none'
						>
							Sign up
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
