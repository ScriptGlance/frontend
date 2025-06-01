import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import ChatRepository, {
    ChatMessage, GetModeratorChatsParams,
    GetUserChatMessagesParams,
    ModeratorChatListItem
} from "../api/repositories/chatRepository.ts";

const DEFAULT_ERROR_MESSAGE = "Щось пішло не так";

interface UseModeratorChatsProps {
    type: "assigned" | "general" | "closed";
    initialSearch?: string;
    limit?: number;
    offset?: number;
    debounceMs?: number;
}

export function useModeratorChatMessages(chatId: number | null, params: GetUserChatMessagesParams) {
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
            if (!token) {
                throw new Error("Not authenticated");
            }

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

export function useModeratorChats({
                                      type,
                                      initialSearch = "",
                                      limit = 20,
                                      offset = 0,
                                      debounceMs = 400,
                                  }: UseModeratorChatsProps) {
    const { getToken } = useAuth();

    const [search, setSearch] = useState(initialSearch);
    const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

    const [currentOffset, setCurrentOffset] = useState(offset);

    const [chats, setChats] = useState<ModeratorChatListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentOffset(0);
        }, debounceMs);
        return () => clearTimeout(handler);
    }, [search, debounceMs]);

    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            setLoading(true);
            setError(null);

            const token = getToken(Role.Moderator);
            if (!token) {
                throw new Error("Not authenticated");
            }

            const params: GetModeratorChatsParams = {
                type,
                search: debouncedSearch || undefined,
                limit,
                offset: currentOffset,
            };

            const data = await ChatRepository.getModeratorChats(token, params, abortController.signal);

            if (!abortController.signal.aborted) {
                setChats(data || []);
            }
        } catch (e: any) {
            if (!abortController.signal.aborted && e.name !== "AbortError") {
                setError(DEFAULT_ERROR_MESSAGE);
                setChats([]);
            }
        } finally {
            if (!abortController.signal.aborted) setLoading(false);
            if (abortControllerRef.current === abortController) abortControllerRef.current = null;
        }
    }, [getToken, type, debouncedSearch, limit, currentOffset]);

    useEffect(() => {
        fetchData();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, [fetchData]);

    const setPage = (page: number) => setCurrentOffset(page * limit);
    const resetSearch = () => setSearch("");

    const refetch = fetchData;

    return {
        chats,
        loading,
        error,
        search,
        setSearch,
        debouncedSearch,
        offset: currentOffset,
        setPage,
        setOffset: setCurrentOffset,
        resetSearch,
        refetch,
    };
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
            const data = await ChatRepository.getModeratorUnreadCounts(token);
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