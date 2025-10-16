
'use client';
import { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface AIToggleProps {
	open: boolean;
	onToggle: () => void;
	children: React.ReactNode;
	position?: 'inline' | 'floating';
}

const panelVariants = {
	closed: { opacity: 0, y: 12, scale: 0.995 },
	open: { opacity: 1, y: 0, scale: 1 },
};

const AIToggle: FC<AIToggleProps> = ({
	open,
	onToggle,
	children,
	position = 'inline',
}) => {
	return (
		<div
			className={position === 'floating' ? 'fixed bottom-6 right-6 z-50' : ''}
		>
			<div className='flex items-end gap-4'>
				<button
					onClick={onToggle}
					aria-expanded={open}
					className='bg-blue-600 text-white p-3 rounded-full shadow-lg hover:scale-105 transition-transform'
				>
					<motion.span
						animate={{ rotate: open ? 45 : 0 }}
						transition={{ type: 'spring', stiffness: 300, damping: 18 }}
						className='flex items-center gap-2'
					>
						<Sparkles className='w-4 h-4' />
					</motion.span>
				</button>
			</div>

			<AnimatePresence>
				{open && (
					<motion.div
						initial='closed'
						animate='open'
						exit='closed'
						variants={panelVariants}
						transition={{ duration: 0.22 }}
						className='mt-4 md:mt-0 w-full bg-card border rounded-lg shadow-xl overflow-hidden'
						style={{ willChange: 'transform, opacity' }}
					>
						{children}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default AIToggle;
