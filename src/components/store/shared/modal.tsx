'use client';
import { X } from 'lucide-react';
import { Dispatch, FC, ReactNode, SetStateAction, useRef } from 'react';
import useOnClickOutside from '@/hooks/useOnClickOutside';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
	title?: string;
	show: boolean;
	setShow: Dispatch<SetStateAction<boolean>>;
	children: ReactNode;
}

const Modal: FC<ModalProps> = ({ children, title, show, setShow }) => {
	const ref = useRef<HTMLDivElement | null>(null);
	const close = () => setShow(false);

	useOnClickOutside(ref, close);

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					key='modal'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1, pointerEvents: 'auto' }}
					exit={{ opacity: 0, pointerEvents: 'none' }}
					transition={{ duration: 0.18 }}
					className='w-full h-full fixed top-0 left-0 right-0 bottom-0 bg-gray-50/65 z-50 grid place-items-center p-2'
				>
					<motion.div
						ref={ref}
						initial={{ y: 12 }}
						animate={{ y: 0 }}
						exit={{ y: 8 }}
						transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
						className='bg-background px-4 md:px-10 w-full max-w-[900px] max-h-[calc(100vh-2rem)] overflow-y-auto py-5 shadow-md rounded-lg'
					>
						<div className='flex items-center justify-between border-b pb-2'>
							<h1 className='text-xl font-bold'>{title}</h1>
							<X
								className='w-4 h-4 cursor-pointer hover:text-pink-600'
								onClick={() => setShow(false)}
							/>
						</div>
						<div className='mt-6'>{children}</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default Modal;
