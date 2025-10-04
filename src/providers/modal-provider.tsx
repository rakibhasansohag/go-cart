/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// React, Next.js
import { createContext, useContext, useEffect, useState } from 'react';

// Prisma models
import { User } from '@prisma/client';

interface ModalProviderProps {
	children: React.ReactNode;
}

export type ModalData = {
	user?: User;
};
type ModalContextType = {
	data: ModalData;
	isOpen: boolean;
	setOpen: (modal: React.ReactNode, fetchData?: () => Promise<any>) => void;
	setClose: () => void;
};

export const ModalContext = createContext<ModalContextType>({
	data: {},
	isOpen: false,
	setOpen: (modal: React.ReactNode, fetchData?: () => Promise<any>) => {},
	setClose: () => {},
});

const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [data, setData] = useState<ModalData>({});
	const [showingModal, setShowingModal] = useState<React.ReactNode>(null);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	/**
	 *
	 * @param modal
	 * @param fetchData
	 * @returns
	 *
	 * const setOpen = async ( modal: React.ReactNode, fetchData?: () => Promise<any>, ) => { if (modal) { if (fetchData) { setData({ ...data, ...(await fetchData()) } || {}); } setShowingModal(modal); setIsOpen(true); } }; const setClose = () => { setIsOpen(false); setData({}); };
	 */

	const setOpen = async (
		modal: React.ReactNode,
		fetchData?: () => Promise<any>,
	) => {
		if (!modal) return;

		if (fetchData) {
			try {
				const fetched = await fetchData();
				// use functional update to avoid stale `data` closure
				setData((prev) => ({ ...prev, ...(fetched ?? {}) }));
			} catch (err) {
				console.error('Modal fetchData failed:', err);
				setData((prev) => ({ ...prev }));
			}
		}

		setShowingModal(modal);
		setIsOpen(true);
	};

	const setClose = () => {
		setIsOpen(false);
		setData({});
	};

	if (!isMounted) return null;

	return (
		<ModalContext.Provider value={{ data, setOpen, setClose, isOpen }}>
			{children}
			{showingModal}
		</ModalContext.Provider>
	);
};

export const useModal = () => {
	const context = useContext(ModalContext);
	if (!context) {
		throw new Error('useModal must be used within the modal provider');
	}
	return context;
};

export default ModalProvider;
