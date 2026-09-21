'use client';

import React, { useState } from 'react';
import { DocsHeader } from './docs-header';
import { DocsSidebar } from './docs-sidebar';
import { DocsSearchModal } from './docs-search-modal';

interface DocsShellProps {
	children: React.ReactNode;
}

export function DocsShell({ children }: DocsShellProps) {
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

	return (
		<div className='min-h-screen flex flex-col bg-background text-foreground antialiased'>
			<DocsHeader
				onOpenSearch={() => setIsSearchOpen(true)}
				onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
			/>
			<DocsSearchModal
				isOpen={isSearchOpen}
				onClose={() => setIsSearchOpen(false)}
				onOpen={() => setIsSearchOpen(true)}
			/>
			<div className='flex-1 flex max-w-[1600px] w-full mx-auto'>
				<DocsSidebar
					isOpen={isMobileSidebarOpen}
					onClose={() => setIsMobileSidebarOpen(false)}
				/>
				<div className='flex-1 min-w-0 flex flex-col'>
					{children}
				</div>
			</div>
		</div>
	);
}
