import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getBuyerConversations } from '@/queries/messages';
import BuyerMessagesView from './buyer-messages-view';

type SearchParams = {
	conversationId?: string;
};

export default async function BuyerMessagesPage({
	searchParams,
}: {
	searchParams?: Promise<SearchParams>;
}) {
	const user = await currentUser();
	if (!user) {
		redirect('/');
	}

	const awaitedSearchParams = searchParams ? await searchParams : {};
	const initialData = await getBuyerConversations();

	return (
		<main className='w-full'>
			<BuyerMessagesView
				initialData={initialData}
				initialConversationId={awaitedSearchParams.conversationId}
			/>
		</main>
	);
}
