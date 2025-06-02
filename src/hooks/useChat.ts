import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import ChatRepository from "../api/repositories/chatRepository.ts";

export interface ModeratorChatListItem {
    chat_id: number;
    user_full_name: string;
    last_message: string;
    last_message_sent_date: string;
    unread_messages_count: number;
    avatar?: string;
}

interface ChatMessage {
    chat_message_id: number;
    text: string;
    sent_date: string;
    is_written_by_moderator: boolean;
}

interface GetUserChatMessagesParams {
    offset?: number;
    limit?: number;
}

type ChatType = "general" | "assigned" | "closed";

interface GetModeratorChatsParams {
    type: ChatType;
    offset: number;
    limit: number;
}

interface ChatsResponse {
    data: ModeratorChatListItem[];
    error: boolean;
}
const DEFAULT_ERROR_MESSAGE = "Щось пішло не так";

export function useModeratorChatMessages(chatId: number | null, params: GetUserChatMessagesParams = {}) {
    const { getToken } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const lastFetchTimeRef = useRef<number>(0);

    const fetchData = useCallback(async () => {
        if (!chatId) {
            setMessages([]);
            return;
        }
        const fetchForChatId = chatId;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        lastFetchTimeRef.current = Date.now();

        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.Moderator);
            if (!token) throw new Error("Not authenticated");

            const data = await ChatRepository.getModeratorChatMessages(token, chatId, params, abortController.signal);

            if (!abortController.signal.aborted && chatId === fetchForChatId) {
                setMessages(data || []);
            }
        } catch (e: any) {
            if (!abortController.signal.aborted && chatId === fetchForChatId) {
                setError(DEFAULT_ERROR_MESSAGE);
                setMessages([]);
            }
        } finally {
            if (!abortController.signal.aborted && chatId === fetchForChatId) {
                setLoading(false);
            }
            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
        }
    }, [getToken, chatId, params]);

    const fetchDataRef = useRef(fetchData);
    useEffect(() => {
        fetchDataRef.current = fetchData;
    }, [fetchData]);

    useEffect(() => {
        fetchDataRef.current();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, [chatId]);

    const refetch = useCallback(() => fetchData(), [fetchData]);

    return { messages, loading, error, refetch };
}

export function useModeratorChats(params: GetModeratorChatsParams) {
    const { getToken } = useAuth();
    const [chats, setChats] = useState<ModeratorChatListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.Moderator);
            if (!token) throw new Error("Not authenticated");

            const response = await fetch(
                `${import.meta.env.VITE_APP_API_BASE_URL}/chat/moderator/chats?${new URLSearchParams(params as any)}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: abortController.signal
                }
            );

            if (!response.ok) throw new Error("Failed to fetch chats");

            const responseData: ChatsResponse = await response.json();

            if (!abortController.signal.aborted) {
                setChats(responseData.data || []);
            }
        } catch (e: any) {
            if (!abortController.signal.aborted && e.name !== "AbortError") {
                setError(DEFAULT_ERROR_MESSAGE);
                setChats([]);
            }
        } finally {
            if (!abortController.signal.aborted) {
                setLoading(false);
            }
            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
        }
    }, [getToken, params]);

    useEffect(() => {
        fetchData();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, [fetchData]);

    return { chats, loading, error, refetch: fetchData };
}

export function useModeratorUnreadCounts() {
    const { getToken } = useAuth();
    const [generalChatsUnread, setGeneralChatsUnread] = useState(0);
    const [myChatsUnread, setMyChatsUnread] = useState(0);

    const fetchData = useCallback(async () => {
        const token = getToken(Role.Moderator);
        if (!token) {
            setGeneralChatsUnread(0);
            setMyChatsUnread(0);
            return;
        }
        try {
            const response = await fetch(
                `${import.meta.env.VITE_APP_API_BASE_URL}/chat/moderator/unread-counts`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            );

            if (!response.ok) throw new Error("Failed to fetch unread counts");

            const data = await response.json();
            setGeneralChatsUnread(data.general_chats_count);
            setMyChatsUnread(data.assigned_chats_unread_messages_count);
        } catch {
            setGeneralChatsUnread(0);
            setMyChatsUnread(0);
        }
    }, [getToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { generalChatsUnread, myChatsUnread, refetch: fetchData };
}

export function useModeratorChatActions() {
    const { getToken } = useAuth();

    const assignChat = useCallback(async (chatId: number) => {
        const token = getToken(Role.Moderator);
        if (!token) throw new Error("Not authenticated");
        await ChatRepository.assignModeratorToChat(token, chatId);
    }, [getToken]);

    const unassignChat = useCallback(async (chatId: number) => {
        const token = getToken(Role.Moderator);
        if (!token) throw new Error("Not authenticated");

        await ChatRepository.unassignModeratorFromChat(token, chatId);
    }, [getToken]);

    const closeChat = useCallback(async (chatId: number) => {
        const token = getToken(Role.Moderator);
        if (!token) throw new Error("Not authenticated");

        await ChatRepository.closeModeratorChat(token, chatId);
    }, [getToken]);

    const sendMessage = useCallback(async (chatId: number, text: string) => {
        const token = getToken(Role.Moderator);
        if (!token) throw new Error("Not authenticated");

        await ChatRepository.sendModeratorChatMessage(token, chatId, text);
    }, [getToken]);

    const markAsRead = useCallback(async (chatId: number) => {
        const token = getToken(Role.Moderator);
        if (!token) throw new Error("Not authenticated");
        await ChatRepository.markModeratorChatAsRead(token, chatId);
    }, [getToken]);

    return { assignChat, unassignChat, closeChat, sendMessage, markAsRead };
}