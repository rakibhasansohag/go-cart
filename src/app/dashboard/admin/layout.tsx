import React from 'react';

function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div>
			<h1>AdminDashboardLayout admin</h1>
			{children}
		</div>
	);
}

export default AdminDashboardLayout;
