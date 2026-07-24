
'use client';

// React, Next.js
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

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
	setOpen: (
		modal: React.ReactNode,
		fetchData?: () => Promise<Record<string, unknown>>,
	) => void;
	setClose: (force?: boolean) => void;
	isDirty: boolean;
	getIsDirty: () => boolean;
	setIsDirty: (dirty: boolean) => void;
};

export const ModalContext = createContext<ModalContextType>({
	data: {},
	isOpen: false,
	setOpen: () => {},
	setClose: () => {},
	isDirty: false,
	getIsDirty: () => false,
	setIsDirty: () => {},
});

const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
	const [isOpen, setIsOpen] = useState(false);
	const isDirtyRef = useRef(false);
	const [data, setData] = useState<ModalData>({});
	const [showingModal, setShowingModal] = useState<React.ReactNode>(null);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const setIsDirty = useCallback((dirty: boolean) => {
		isDirtyRef.current = dirty;
	}, []);

	const getIsDirty = useCallback(() => {
		return isDirtyRef.current;
	}, []);

	const setOpen = useCallback(
		async (
			modal: React.ReactNode,
			fetchData?: () => Promise<Record<string, unknown>>,
		) => {
			if (!modal) return;

			if (fetchData) {
				try {
					const fetched = await fetchData();
					setData((prev) => ({ ...prev, ...(fetched ?? {}) }));
				} catch (err) {
					console.error('Modal fetchData failed:', err);
					setData((prev) => ({ ...prev }));
				}
			}

			isDirtyRef.current = false;
			setShowingModal(modal);
			setIsOpen(true);
		},
		[],
	);

	const setClose = useCallback((force?: boolean) => {
		if (!force && isDirtyRef.current) {
			return;
		}
		isDirtyRef.current = false;
		setIsOpen(false);
		setData({});
	}, []);

	return (
		<ModalContext.Provider
			value={{
				data,
				setOpen,
				setClose,
				isOpen,
				isDirty: isDirtyRef.current,
				getIsDirty,
				setIsDirty,
			}}
		>
			{children}
			{isMounted && showingModal}
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
