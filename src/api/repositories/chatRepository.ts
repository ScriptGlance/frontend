import apiClient from '../axiosClient';

export interface ChatMessage {
    chat_message_id: number;
    text: string;
    is_written_by_moderator: boolean;
    sent_date: string;
}

export interface UserChatMessagesResponse {
    data: ChatMessage[];
    error: boolean;
}

export interface UserChatMessageResponse {
    data: ChatMessage;
    error: boolean;
}

export interface UnreadCountResponse {
    data: { unread_count: number };
    error: boolean;
}

export interface ModeratorChatListItem {
    chat_id: number;
    user_full_name: string;
    last_message: string;
    last_message_sent_date: string;
    unread_messages_count: number;
    avatar?: string;
}

export interface ModeratorChatsResponse {
    data: ModeratorChatListItem[];
    error: boolean;
}

export interface ModeratorUnreadCountsResponse {
    data: {
        general_chats_count: number;
        assigned_chats_unread_messages_count: number;
    };
    error: boolean;
}

export interface GetUserChatMessagesParams {
    offset?: number;
    limit?: number;
}

export interface GetModeratorChatsParams {
    type: 'general' | 'assigned' | 'closed';
    offset?: number;
    limit?: number;
}

export interface RequestConfig {
    headers: { Authorization: string };
    params?: any;
    signal?: AbortSignal;
}

class ChatsRepository {
    private static instance: ChatsRepository;

    private constructor() {
    }

    public static getInstance(): ChatsRepository {
        if (!ChatsRepository.instance) {
            ChatsRepository.instance = new ChatsRepository();
        }
        return ChatsRepository.instance;
    }


    public async getUserActiveChatMessages(
        token: string,
        params: GetUserChatMessagesParams = {}
    ): Promise<ChatMessage[]> {
        const res = await apiClient.get<UserChatMessagesResponse>(
            "/chat/user/active",
            {
                headers: {Authorization: `Bearer ${token}`},
                params,
            }
        );
        if (res.error) throw new Error("Failed to get user chat messages");
        return res.data;
    }

    public async sendUserActiveChatMessage(
        token: string,
        text: string
    ): Promise<ChatMessage> {
        const res = await apiClient.post<UserChatMessageResponse>(
            "/chat/user/active",
            {text},
            {
                headers: {Authorization: `Bearer ${token}`}
            }
        );
        if (res.error) throw new Error("Failed to send user chat message");
        return res.data;
    }

    public async getUserActiveUnreadCount(
        token: string
    ): Promise<number> {
        const res = await apiClient.get<UnreadCountResponse>(
            "/chat/user/active/unread-count",
            {
                headers: {Authorization: `Bearer ${token}`}
            }
        );
        if (res.error) throw new Error("Failed to get unread count");
        return res.data.unread_count;
    }

    public async markUserActiveChatAsRead(token: string): Promise<void> {
        const res = await apiClient.put(
            "/chat/user/active/read",
            null,
            {
                headers: {Authorization: `Bearer ${token}`}
            }
        );
        if (res.error) throw new Error("Failed to mark chat as read");
    }

    public async getModeratorChats(
        token: string,
        params: GetModeratorChatsParams,
        signal?: AbortSignal
    ): Promise<ModeratorChatListItem[]> {
        const res = await apiClient.get<ModeratorChatsResponse>(
            "/chat/moderator/chats",
            {
                headers: { Authorization: `Bearer ${token}` },
                params,
                signal
            }
        );
        if (res.error) throw new Error("Failed to get moderator chats");
        return res.data;
    }

    public async getModeratorUnreadCounts(
        token: string
    ): Promise<ModeratorUnreadCountsResponse["data"]> {
        const res = await apiClient.get<ModeratorUnreadCountsResponse>(
            "/chat/moderator/unread-counts",
            {
                headers: {Authorization: `Bearer ${token}`}
            }
        );
        if (res.error) throw new Error("Failed to get moderator unread counts");
        return res.data;
    }

    public async getModeratorChatMessages(
        token: string,
        chatId: number,
        params: GetUserChatMessagesParams = {},
        signal?: AbortSignal
    ): Promise<ChatMessage[]> {
        const res = await apiClient.get<UserChatMessagesResponse>(
            `/chat/moderator/${chatId}/messages`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params,
                signal
            }
        );
        if (res.error) throw new Error("Failed to get moderator chat messages");
        return res.data;
    }

    public async sendModeratorChatMessage(
        token: string,
        chatId: number,
        text: string
    ): Promise<ChatMessage> {
        const res = await apiClient.post<UserChatMessageResponse>(
            `/chat/moderator/${chatId}/messages`,
            {text},
            {
                headers: {Authorization: `Bearer ${token}`}
            }
        );
        if (res.error) throw new Error("Failed to send moderator chat message");
        return res.data;
    }

    public async assignModeratorToChat(
        token: string,
        chatId: number
    ): Promise<void> {
        const res = await apiClient.put(
            `/chat/moderator/${chatId}/assign`,
            null,
            {
                headers: {Authorization: `Bearer ${token}`}
            }
        );
        if (res.error) throw new Error("Failed to assign chat to moderator");
    }

    public async unassignModeratorFromChat(
        token: string,
        chatId: number
    ): Promise<void> {
        const res = await apiClient.put(
            `/chat/moderator/${chatId}/unassign`,
            null,
            {
                headers: {Authorization: `Bearer ${token}`}
            }
        );
        if (res.error) throw new Error("Failed to unassign chat from moderator");
    }

    public async closeModeratorChat(
        token: string,
        chatId: number
    ): Promise<void> {
        const res = await apiClient.post(
            `/chat/moderator/${chatId}/close`,
            null,
            {
                headers: {Authorization: `Bearer ${token}`}
            }
        );
        if (res.error) throw new Error("Failed to close moderator chat");
    }

    public async markModeratorChatAsRead(
        token: string,
        id: number
    ): Promise<void> {
        const res = await apiClient.put(
            `/chat/moderator/${id}/read`,
            null,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        if (res.error) throw new Error("Failed to mark moderator chat as read");
    }
}

export default ChatsRepository.getInstance();
