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

export function useModeratorChatMessages(chatId: number | null, limit = 20) {
    const { getToken } = useAuth();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setMessages([]);
        setOffset(0);
        setHasMore(true);
        setError(null);
    }, [chatId]);

    useEffect(() => {
        if (chatId) {
            fetchMessages(0, false);
        }
        // eslint-disable-next-line
    }, [chatId]);

    const fetchMessages = useCallback(
        async (currentOffset = 0, append = false) => {
            const token = getToken(Role.Moderator);
            if (!token || !chatId) return;

            if (currentOffset === 0) setLoading(true);
            else setLoadingMore(true);

            try {
                setError(null);
                const data = await ChatRepository.getModeratorChatMessages(token, chatId, {
                    offset: currentOffset,
                    limit,
                });

                if (data) {
                    if (append) {
                        setMessages(prev => [...data, ...prev]);
                    } else {
                        setMessages(data);
                    }
                    setHasMore(data.length === limit);
                } else {
                    if (!append) setMessages([]);
                    setHasMore(false);
                }
            } catch {
                setError("Не вдалося завантажити повідомлення");
                if (!append) setMessages([]);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [getToken, chatId, limit]
    );

    const loadMore = useCallback(() => {
        const nextOffset = offset + limit;
        setOffset(nextOffset);
        fetchMessages(nextOffset, true);
    }, [offset, limit, fetchMessages]);

    useEffect(() => {
        if (offset > 0 && chatId) {
            fetchMessages(offset, true);
        }
        // eslint-disable-next-line
    }, [offset, chatId]);

    const refetch = useCallback(() => {
        setOffset(0);
        fetchMessages(0, false);
    }, [fetchMessages]);

    return {
        messages,
        loading,
        loadingMore,
        hasMore,
        error,
        loadMore,
        refetch,
        setMessages,
    };
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

export function useUserChatMessages(params: GetUserChatMessagesParams) {
    const { getToken } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchMessages = useCallback(async () => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            setLoading(true);
            setError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");

            const data = await ChatRepository.getUserActiveChatMessages(token, params);
            if (!abortController.signal.aborted) setMessages(data || []);
        } catch (e: any) {
            if (!abortControllerRef.current?.signal.aborted) {
                setError(DEFAULT_ERROR_MESSAGE);
                setMessages([]);
            }
        } finally {
            if (!abortControllerRef.current?.signal.aborted) setLoading(false);
            if (abortControllerRef.current === abortController) abortControllerRef.current = null;
        }
    }, [getToken, params]);

    useEffect(() => {
        fetchMessages();
        return () => {
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
        };
    }, [fetchMessages]);

    const sendMessage = useCallback(async (text: string) => {
        const token = getToken(Role.User);
        if (!token) throw new Error("Not authenticated");
        const msg = await ChatRepository.sendUserActiveChatMessage(token, text);
        setMessages((prev) => [...prev, msg]);
        return msg;
    }, [getToken]);

    const markAsRead = useCallback(async () => {
        const token = getToken(Role.User);
        if (!token) throw new Error("Not authenticated");
        await ChatRepository.markUserActiveChatAsRead(token);
    }, [getToken]);

    return { messages, loading, error, refetch: fetchMessages, sendMessage, markAsRead, setMessages };
}

export function useUserUnreadCount() {
    const { getToken } = useAuth();
    const [unread, setUnread] = useState(0);

    const fetchUnread = useCallback(async () => {
        try {
            const token = getToken(Role.User);
            if (!token) {
                setUnread(0);
                return;
            }
            const count = await ChatRepository.getUserActiveUnreadCount(token);
            setUnread(count);
        } catch {
            setUnread(0);
        }
    }, [getToken]);

    useEffect(() => {
        fetchUnread();
    }, [fetchUnread]);

    return { unread, refetch: fetchUnread };
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