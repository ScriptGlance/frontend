import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import ChatRepository, {
    ChatMessage, GetModeratorChatsParams,
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

export function useModeratorChatMessages(chatId: number | null, limit = 20, enabled = true) {
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
        if (!enabled) return;
        if (chatId) {
            fetchMessages(0, false);
        }
    }, [chatId, enabled]);

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
        fetchMessages
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
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentOffset(0);
        }, debounceMs);
        return () => clearTimeout(handler);
    }, [search, debounceMs]);

    useEffect(() => {
        setCurrentOffset(0);
        setChats([]);
        setHasMore(true);
    }, [debouncedSearch, type]);

    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = useCallback(async () => {
        if (!hasMore && currentOffset > 0) return;

        if (abortControllerRef.current) abortControllerRef.current.abort();

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            setLoading(true);
            setError(null);

            const token = getToken(Role.Moderator);
            if (!token) throw new Error("Not authenticated");

            const params: GetModeratorChatsParams = {
                type,
                search: debouncedSearch || undefined,
                limit,
                offset: currentOffset,
            };

            const data = await ChatRepository.getModeratorChats(token, params, abortController.signal);

            if (!abortController.signal.aborted) {
                setHasMore(data && data.length === limit);

                if (currentOffset === 0) {
                    setChats(data || []);
                } else {
                    setChats(prev => [...prev, ...(data || [])]);
                }
            }
        } catch (e: any) {
            if (!abortController.signal.aborted && e.name !== "AbortError") {
                setError(DEFAULT_ERROR_MESSAGE);
                setChats([]);
                setHasMore(false);
            }
        } finally {
            if (!abortController.signal.aborted) setLoading(false);
            if (abortControllerRef.current === abortController) abortControllerRef.current = null;
        }
    }, [getToken, type, debouncedSearch, limit, currentOffset, hasMore]);

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

    const refetch = useCallback(() => {
        setCurrentOffset(0);
        setChats([]);
        setHasMore(true);
        fetchData();
    }, [fetchData]);

    const setChatsSafe = useCallback(
        (updater: ModeratorChatListItem[] | ((prev: ModeratorChatListItem[]) => ModeratorChatListItem[])) => {
            setChats(prev => {
                let next: ModeratorChatListItem[];
                if (typeof updater === "function") {
                    next = (updater as (prev: ModeratorChatListItem[]) => ModeratorChatListItem[])(prev);
                } else {
                    next = updater;
                }

                const seen = new Set<number>();
                return next.filter(chat => {
                    if (seen.has(chat.chat_id)) return false;
                    seen.add(chat.chat_id);
                    return true;
                });
            });
        },
        []
    );

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
        setChats: setChatsSafe,
        hasMore,
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

export function useUserChatMessages(params: { offset?: number; limit: number }) {
    const { getToken } = useAuth();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const offsetRef = useRef(0);

    const resetState = useCallback(() => {
        setMessages([]);
        setLoading(false);
        setLoadingMore(false);
        setError(null);
        setHasMore(true);
        offsetRef.current = 0;
    }, []);

    useEffect(() => {
        setMessages([]);
        setError(null);
        offsetRef.current = 0;
        setHasMore(true);
        fetchMessages(0, false);
    }, [params.limit]);

    const fetchMessages = useCallback(
        async (currentOffset = 0, append = false) => {
            const token = getToken(Role.User);
            if (!token) return;

            if (currentOffset === 0) setLoading(true);
            else setLoadingMore(true);

            try {
                setError(null);
                const data = await ChatRepository.getUserActiveChatMessages(token, {
                    offset: currentOffset,
                    limit: params.limit,
                });

                if (data) {
                    if (append) {
                        setMessages(prev => [...data, ...prev]);
                    } else {
                        setMessages(data);
                    }
                    setHasMore(data.length === params.limit);
                } else {
                    if (!append) setMessages([]);
                    setHasMore(false);
                }
                offsetRef.current = currentOffset;
            } catch {
                setError(DEFAULT_ERROR_MESSAGE);
                if (!append) setMessages([]);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [getToken, params.limit]
    );

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        const nextOffset = messages.length;
        await fetchMessages(nextOffset, true);
    }, [fetchMessages, loadingMore, hasMore, messages.length]);

    const refetch = useCallback(() => {
        offsetRef.current = 0;
        fetchMessages(0, false);
    }, [fetchMessages]);

    const sendMessage = useCallback(async (text: string) => {
        const token = getToken(Role.User);
        if (!token) throw new Error("Not authenticated");
        const msg = await ChatRepository.sendUserActiveChatMessage(token, text);
        setMessages(prev => [...prev, msg]);
        return msg;
    }, [getToken]);

    const markAsRead = useCallback(async () => {
        const token = getToken(Role.User);
        if (!token) throw new Error("Not authenticated");
        await ChatRepository.markUserActiveChatAsRead(token);
    }, [getToken]);

    return {
        messages,
        loading,
        loadingMore,
        hasMore,
        error,
        fetchMessages,
        loadMore,
        refetch,
        sendMessage,
        markAsRead,
        setMessages,
        resetState,
    };
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