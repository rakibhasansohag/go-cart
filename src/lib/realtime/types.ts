export interface RealtimeSyncParams {
	lastCheckedAt?: string;
	conversationId?: string;
	storeUrl?: string;
}

export interface RealtimeSyncResult {
	hasNewMessages: boolean;
	newMessagesCount: number;
	hasConversationUpdates: boolean;
	unreadNotificationsCount: number;
	serverTime: string;
}
