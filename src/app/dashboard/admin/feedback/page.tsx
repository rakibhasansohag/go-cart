import React from 'react';
import type { Metadata } from 'next';
import { getAdminFeedbacks } from '@/queries/feedback';
import FeedbackAdminClient from '@/components/dashboard/admin/feedback/feedback-admin-client';
import { MessageSquareText } from 'lucide-react';

export const metadata: Metadata = {
	title: 'Platform Feedback & Observability | Admin Dashboard',
	description:
		'Triage user feedback, bug reports, feature suggestions, and telemetry diagnostics.',
};

export const dynamic = 'force-dynamic';

export default async function AdminFeedbackPage() {
	const data = await getAdminFeedbacks({ page: 1, limit: 100 });

	return (
		<div className='space-y-8 max-w-7xl mx-auto'>
			{/* Header */}
			<div className='space-y-1.5'>
				<div className='flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase'>
					<MessageSquareText className='w-4 h-4' />
					<span>Platform Observability</span>
				</div>
				<h1 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground'>
					Platform Feedback & Suggestions
				</h1>
				<p className='text-sm text-muted-foreground max-w-2xl'>
					Review feedback, suggestions, bug reports, and telemetry submitted by guests, customers, sellers, and fellow developers.
				</p>
			</div>

			{/* Client Management Console */}
			<FeedbackAdminClient
				initialFeedbacks={data.feedbacks}
				metrics={data.metrics}
			/>
		</div>
	);
}
