import React from 'react';

function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div>
			<h1>DashboardLayout admin</h1>
			{children}
		</div>
	);
}

export default DashboardLayout;
