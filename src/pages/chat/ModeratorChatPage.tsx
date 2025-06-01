import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Role } from "../../types/role";
import {
    useModeratorChatActions,
    useModeratorChats,
    useModeratorUnreadCounts,
    useModeratorChatMessages,
} from "../../hooks/useChat";
import { useModeratorChatSocket } from "../../hooks/useChatSocket";
import { Avatar } from "../../components/avatar/Avatar";
import Logo from "../../components/logo/Logo";
import searchIcon from "../../assets/search.svg";
import "./ModeratorChatPage.css";
import RightHeaderButtons from "../../components/rightHeaderButtons/RightHeaderButtons.tsx";
import { NewMessageEvent } from "../../api/socket/chatSocketManager.ts";
import returnChatIcon from "../../assets/return-chat.svg";
import closeChatIcon from "../../assets/close-chat.svg";
import takeChatIcon from "../../assets/take-chat.svg";
import sendIcon from "../../assets/send-icon.svg";
import { ModeratorChatListItem } from "../../api/repositories/chatRepository.ts";

type ChatTab = "my" | "general" | "history";

const CHAT_TABS: { label: string; value: ChatTab }[] = [
    { label: "Мої чати", value: "my" },
    { label: "Загальні чати", value: "general" },
    { label: "Історія", value: "history" },
];

const SELECTED_TAB_KEY = "moderator_selected_tab";
const SELECTED_CHAT_ID_KEY = "moderator_selected_chat_id";
const LIMIT = 20;

function upsertChat(
    list: ModeratorChatListItem[],
    msg: NewMessageEvent,
    getDefaults: (msg: NewMessageEvent) => Partial<ModeratorChatListItem> = () => ({})
): ModeratorChatListItem[] {
    const idx = list.findIndex(c => c.chat_id === msg.chat_id);
    if (idx === -1 && msg.chat_id) {
        return [
            {
                chat_id: msg.chat_id,
                user_id: msg.user_id,
                user_first_name: msg.user_first_name,
                user_last_name: msg.user_last_name,
                avatar: msg.avatar || undefined,
                last_message: msg.text,
                last_message_sent_date: msg.sent_date,
                unread_messages_count: 1,
                ...getDefaults(msg)
            },
            ...list
        ];
    }
    return list.map(c =>
        c.chat_id === msg.chat_id
            ? {
                ...c,
                last_message: msg.text,
                last_message_sent_date: msg.sent_date,
                unread_messages_count: (c.unread_messages_count || 0) + 1
            }
            : c
    );
}

const ModeratorChatPage: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [selectedTab, setSelectedTab] = useState<ChatTab>(() => {
        const savedTab = localStorage.getItem(SELECTED_TAB_KEY);
        return (savedTab === "my" || savedTab === "general" || savedTab === "history")
            ? savedTab as ChatTab
            : "my";
    });

    const [chat, setChat] = useState<ModeratorChatListItem | null>(null);
    const [pendingChatId, setPendingChatId] = useState<number | null>(() => {
        const savedChatId = localStorage.getItem(SELECTED_CHAT_ID_KEY);
        return savedChatId ? parseInt(savedChatId, 10) : null;
    });

    const [messageInput, setMessageInput] = useState("");
    const [searchValue, setSearchValue] = useState("");
    const [sending, setSending] = useState(false);
    const chatRestoredRef = useRef(false);
    const scrollToBottomRef = useRef(false);

    const { generalChatsUnread, myChatsUnread, refetch: refetchUnreadCounts } = useModeratorUnreadCounts();

    const {
        chats: myChats,
        loading: myChatsLoading,
        setSearch: setMyChatsSearch,
        offset: myChatsOffset,
        setOffset: setMyChatsOffset,
        refetch: refetchMyChats
    } = useModeratorChats({
        type: "assigned",
        initialSearch: selectedTab === "my" ? searchValue : "",
        limit: LIMIT,
        offset: 0,
    });

    const {
        chats: generalChats,
        loading: generalChatsLoading,
        setSearch: setGeneralChatsSearch,
        offset: generalChatsOffset,
        setOffset: setGeneralChatsOffset,
        refetch: refetchGeneralChats
    } = useModeratorChats({
        type: "general",
        initialSearch: selectedTab === "general" ? searchValue : "",
        limit: LIMIT,
        offset: 0,
    });

    const {
        chats: historyChats,
        loading: historyChatsLoading,
        setSearch: setHistoryChatsSearch,
        offset: historyChatsOffset,
        setOffset: setHistoryChatsOffset,
        refetch: refetchHistoryChats
    } = useModeratorChats({
        type: "closed",
        initialSearch: selectedTab === "history" ? searchValue : "",
        limit: LIMIT,
        offset: 0,
    });

    const [localMyChats, setLocalMyChats] = useState<ModeratorChatListItem[]>([]);
    const [localGeneralChats, setLocalGeneralChats] = useState<ModeratorChatListItem[]>([]);
    const [localHistoryChats, setLocalHistoryChats] = useState<ModeratorChatListItem[]>([]);

    const chatId = chat?.chat_id ?? null;
    const {
        messages,
        loading: messagesLoading,
        error: messagesError,
        refetch: refetchMessages,
    } = useModeratorChatMessages(chatId, { offset: 0, limit: 50 });

    useEffect(() => {
        if (!myChatsLoading && Array.isArray(myChats)) {
            if (myChatsOffset === 0) {
                setLocalMyChats(myChats);
            } else {
                setLocalMyChats(prev => {
                    const existingIds = new Set(prev.map(c => c.chat_id));
                    const newChats = myChats.filter(c => !existingIds.has(c.chat_id));
                    return [...prev, ...newChats];
                });
            }
        }
    }, [myChats, myChatsLoading, myChatsOffset]);
    useEffect(() => {
        if (!generalChatsLoading && Array.isArray(generalChats)) {
            if (generalChatsOffset === 0) {
                setLocalGeneralChats(generalChats);
            } else {
                setLocalGeneralChats(prev => {
                    const existingIds = new Set(prev.map(c => c.chat_id));
                    const newChats = generalChats.filter(c => !existingIds.has(c.chat_id));
                    return [...prev, ...newChats];
                });
            }
        }
    }, [generalChats, generalChatsLoading, generalChatsOffset]);
    useEffect(() => {
        if (!historyChatsLoading && Array.isArray(historyChats)) {
            if (historyChatsOffset === 0) {
                setLocalHistoryChats(historyChats);
            } else {
                setLocalHistoryChats(prev => {
                    const existingIds = new Set(prev.map(c => c.chat_id));
                    const newChats = historyChats.filter(c => !existingIds.has(c.chat_id));
                    return [...prev, ...newChats];
                });
            }
        }
    }, [historyChats, historyChatsLoading, historyChatsOffset]);

    useEffect(() => {
        if (chatRestoredRef.current || !pendingChatId) return;
        let chatToRestore: ModeratorChatListItem | undefined;
        if (selectedTab === "my" && !myChatsLoading && localMyChats.length > 0) {
            chatToRestore = localMyChats.find(c => c.chat_id === pendingChatId);
        } else if (selectedTab === "general" && !generalChatsLoading && localGeneralChats.length > 0) {
            chatToRestore = localGeneralChats.find(c => c.chat_id === pendingChatId);
        } else if (selectedTab === "history" && !historyChatsLoading && localHistoryChats.length > 0) {
            chatToRestore = localHistoryChats.find(c => c.chat_id === pendingChatId);
        }
        if (chatToRestore) {
            setChat(chatToRestore);
            chatRestoredRef.current = true;
            setPendingChatId(null);
        }
    }, [
        pendingChatId, selectedTab,
        myChatsLoading, localMyChats,
        generalChatsLoading, localGeneralChats,
        historyChatsLoading, localHistoryChats
    ]);

    useEffect(() => {
        localStorage.setItem(SELECTED_TAB_KEY, selectedTab);
    }, [selectedTab]);
    useEffect(() => {
        if (chat) {
            localStorage.setItem(SELECTED_CHAT_ID_KEY, chat.chat_id.toString());
        } else {
            localStorage.removeItem(SELECTED_CHAT_ID_KEY);
        }
    }, [chat]);

    useEffect(() => {
        if (
            chat &&
            !localMyChats.some(c => c.chat_id === chat.chat_id) &&
            !localGeneralChats.some(c => c.chat_id === chat.chat_id) &&
            !localHistoryChats.some(c => c.chat_id === chat.chat_id)
        ) {
            setChat(null);
        }
    }, [chat, localMyChats, localGeneralChats, localHistoryChats]);

    const chatsForCurrentTab = useMemo(() => {
        if (selectedTab === "my") return localMyChats;
        if (selectedTab === "general") return localGeneralChats;
        if (selectedTab === "history") return localHistoryChats;
        return [];
    }, [selectedTab, localMyChats, localGeneralChats, localHistoryChats]);

    let chatsLoading = false;
    if (selectedTab === "my") chatsLoading = myChatsLoading;
    if (selectedTab === "general") chatsLoading = generalChatsLoading;
    if (selectedTab === "history") chatsLoading = historyChatsLoading;

    useEffect(() => {
        const handler = setTimeout(() => {
            if (selectedTab === "my") {
                setMyChatsSearch(searchValue);
                setMyChatsOffset(0);
            } else if (selectedTab === "general") {
                setGeneralChatsSearch(searchValue);
                setGeneralChatsOffset(0);
            } else if (selectedTab === "history") {
                setHistoryChatsSearch(searchValue);
                setHistoryChatsOffset(0);
            }
        }, 400);
        return () => clearTimeout(handler);
    }, [
        searchValue, selectedTab,
        setMyChatsSearch, setGeneralChatsSearch, setHistoryChatsSearch,
        setMyChatsOffset, setGeneralChatsOffset, setHistoryChatsOffset,
    ]);

    const { assignChat, unassignChat, closeChat, sendMessage, markAsRead } = useModeratorChatActions();

    const handleSocketMessage = useCallback((msg: NewMessageEvent) => {
        if (msg.chat_id === chatId) {
            refetchMessages();
            scrollToBottomRef.current = true;
        }
        setLocalGeneralChats(prev => upsertChat(prev, msg));
        setLocalHistoryChats(prev => prev.filter(c=> c.user_id !== msg.user_id));
        setLocalMyChats(prev => {
            const chatExists = prev.some(c => c.chat_id === msg.chat_id);
            if (chatExists) {
                return prev.map(c =>
                    c.chat_id === msg.chat_id
                        ? {
                            ...c,
                            unread_messages_count: (selectedTab === "my" && chatId === msg.chat_id)
                                ? 0
                                : (c.unread_messages_count || 0) + 1,
                            last_message: msg.text,
                            last_message_sent_date: msg.sent_date,
                        }
                        : c
                );
            }
            return prev;
        });

        refetchUnreadCounts();
    }, [chatId, selectedTab, refetchMessages, refetchUnreadCounts]);

    useEffect(() => {
        if (selectedTab === "my" && chatId) {
            setLocalMyChats(prev =>
                prev.map(c => c.chat_id === chatId ? { ...c, unread_messages_count: 0 } : c)
            );
        }
    }, [selectedTab, chatId]);

    const handleSocketChatClose = useCallback((data: any) => {
        if (chat && data && chat.chat_id === (data.chat_id ?? data.chatId)) setChat(null);
        refetchMyChats();
        refetchGeneralChats();
        refetchHistoryChats();
        refetchUnreadCounts();
    }, [chat, refetchMyChats, refetchGeneralChats, refetchHistoryChats, refetchUnreadCounts]);

    const handleSocketAssignmentChange = useCallback(() => {
        setMyChatsOffset(0);
        setGeneralChatsOffset(0);
        setHistoryChatsOffset(0);
        refetchMyChats();
        refetchGeneralChats();
        refetchHistoryChats();
        refetchUnreadCounts();
    }, [setMyChatsOffset, setGeneralChatsOffset, setHistoryChatsOffset, refetchMyChats, refetchGeneralChats, refetchHistoryChats, refetchUnreadCounts]);

    useModeratorChatSocket(
        handleSocketMessage,
        handleSocketChatClose,
        handleSocketAssignmentChange
    );

    useEffect(() => {
        if (myChatsOffset === 0) setLocalMyChats(myChats);
    }, [myChatsOffset, myChats]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current && (messages.length > 0 || scrollToBottomRef.current)) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            scrollToBottomRef.current = false;
        }
    }, [messages, messagesLoading]);

    const markAsReadSentRef = useRef<number | null>(null);

    useEffect(() => {
        if (
            selectedTab === "my" &&
            chatId &&
            messages.length > 0 &&
            markAsReadSentRef.current !== chatId
        ) {
            markAsReadSentRef.current = chatId;
            markAsRead(chatId)
                .catch(console.error)
                .finally(() => {
                    refetchUnreadCounts();
                    setLocalMyChats(prev =>
                        prev.map(c => c.chat_id === chatId ? { ...c, unread_messages_count: 0 } : c)
                    );
                });
        }
    }, [selectedTab, chatId, messages.length, markAsRead, refetchUnreadCounts]);
    useEffect(() => {
        markAsReadSentRef.current = null;
    }, [chatId, selectedTab]);

    const handleChatSelect = useCallback((selectedChat: ModeratorChatListItem) => {
        if (chat?.chat_id === selectedChat.chat_id) return;
        setChat(selectedChat);
        scrollToBottomRef.current = true;
    }, [chat?.chat_id]);

    const handleTabChange = useCallback((newTab: ChatTab) => {
        setSelectedTab(newTab);
        setChat(null);
        setMessageInput("");
    }, []);

    const handleAssign = async () => {
        if (!chat) return;
        setSending(true);
        try {
            await assignChat(chat.chat_id);
            const chatData = localGeneralChats.find(c => c.chat_id === chat.chat_id);
            if (chatData) {
                const updatedChatData = { ...chatData, unread_messages_count: 0 };
                setLocalMyChats(prev => [updatedChatData, ...prev]);
                setLocalGeneralChats(prev => prev.filter(c => c.chat_id !== chat.chat_id));
                await markAsRead(chat.chat_id);
                setSelectedTab("my");
                const currentChatId = chat.chat_id;
                setTimeout(() => {
                    const myChatEntry = localMyChats.find(c => c.chat_id === currentChatId) || updatedChatData;
                    if (myChatEntry) {
                        setChat(myChatEntry);
                        scrollToBottomRef.current = true;
                    }
                }, 50);
            }
            await refetchMyChats();
            await refetchGeneralChats();
            await refetchUnreadCounts();
        } finally {
            setSending(false);
        }
    };

    const handleUnassign = async () => {
        if (!chat) return;
        setSending(true);
        try {
            await unassignChat(chat.chat_id);
            setChat(null);
            await refetchMyChats();
            await refetchGeneralChats();
            await refetchUnreadCounts();
        } finally {
            setSending(false);
        }
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const newHeight = Math.min(textarea.scrollHeight, 100);
            textarea.style.height = `${Math.max(44, newHeight)}px`;
        }
    }, [messageInput]);

    const handleCloseChat = async () => {
        if (!chat) return;
        setSending(true);
        try {
            await closeChat(chat.chat_id);
            setChat(null);
            await refetchMyChats();
            await refetchGeneralChats();
            await refetchHistoryChats();
            await refetchUnreadCounts();
        } finally {
            setSending(false);
        }
    };

    const handleSendMessage = async () => {
        if (!chat || !messageInput.trim() || selectedTab === 'history') return;
        setSending(true);
        const messageText = messageInput.trim();
        try {
            await sendMessage(chat.chat_id, messageText);
            await refetchMessages();
            setMessageInput("");
            scrollToBottomRef.current = true;
            if (textareaRef.current) {
                textareaRef.current.style.height = '44px';
            }
            await refetchMyChats();
            await refetchGeneralChats();
            await refetchUnreadCounts();
        } finally {
            setSending(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(SELECTED_TAB_KEY);
        localStorage.removeItem(SELECTED_CHAT_ID_KEY);
        logout(Role.Moderator);
        navigate("/moderator/login");
    };

    const chatListRef = useRef<HTMLDivElement>(null);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 50) {
            if (selectedTab === "my" && !myChatsLoading && myChats.length > 0) {
                setMyChatsOffset(myChatsOffset + LIMIT);
            } else if (selectedTab === "general" && !generalChatsLoading && generalChats.length > 0) {
                setGeneralChatsOffset(generalChatsOffset + LIMIT);
            } else if (selectedTab === "history" && !historyChatsLoading && historyChats.length > 0) {
                setHistoryChatsOffset(historyChatsOffset + LIMIT);
            }
        }
    }, [
        selectedTab,
        myChatsLoading, myChatsOffset, setMyChatsOffset, myChats,
        generalChatsLoading, generalChatsOffset, setGeneralChatsOffset, generalChats,
        historyChatsLoading, historyChatsOffset, setHistoryChatsOffset, historyChats
    ]);

    return (
        <div className="chats-main-container">
            <div className="chats-header-bar">
                <Logo role={Role.Moderator} />
                <RightHeaderButtons role={Role.Moderator} onLogout={handleLogout} />
            </div>
            <div className="chats-center-card">
                <div className="chats-list-sidebar">
                    <div className="chats-search-box">
                        <div className="chats-search-input-wrapper">
                            <img src={searchIcon} alt="Search" className="chats-search-icon" />
                            <input
                                placeholder="Пошук користувачів..."
                                className="chats-search-input"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="chats-tabs-row">
                        {CHAT_TABS.map(tab => (
                            <button
                                key={tab.value}
                                className={selectedTab === tab.value ? "chats-tab-active" : "chats-tab-inactive"}
                                onClick={() => handleTabChange(tab.value)}
                            >
                                {tab.label}
                                {tab.value === "general" && localGeneralChats.length > 0 && (
                                    <span className="chats-general-count-badge">
                                        {generalChatsUnread > 0 ? generalChatsUnread : localGeneralChats.length}
                                    </span>
                                )}
                                {tab.value === "my" && myChatsUnread > 0 && localMyChats.length > 0 && (
                                    <span className="chats-unread-messages-badge">{myChatsUnread}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div
                        className="chats-list-scroll"
                        ref={chatListRef}
                        onScroll={handleScroll}
                    >
                        {chatsLoading && chatsForCurrentTab.length === 0 ? (
                            <div className="chats-loading">Завантаження...</div>
                        ) : !Array.isArray(chatsForCurrentTab) || chatsForCurrentTab.length === 0 ? (
                            <div className="chats-empty-hint">Чатів не знайдено</div>
                        ) : (
                            <>
                                {chatsForCurrentTab.map((c) => (
                                    <div
                                        key={c.chat_id}
                                        className={`chats-list-item${chat?.chat_id === c.chat_id ? " selected" : ""}`}
                                        onClick={() => handleChatSelect(c)}
                                    >
                                        <Avatar
                                            src={c.avatar ? import.meta.env.VITE_APP_API_BASE_URL + c.avatar : null}
                                            alt={c.user_first_name + " " + c.user_last_name}
                                            size={44}
                                            name={c.user_first_name}
                                            surname={c.user_last_name}
                                        />
                                        <div className="chats-list-item-info">
                                            <div className="chats-list-item-name">{c.user_first_name + " " + c.user_last_name}</div>
                                            <div className="chats-list-item-message">{c.last_message}</div>
                                        </div>
                                        <div className="chats-list-item-meta">
                                            <div className="chats-list-item-time">
                                                {c.last_message_sent_date && new Date(c.last_message_sent_date)
                                                    .toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                            {selectedTab === "my" && c.unread_messages_count > 0 && (
                                                <span className="chats-badge">{c.unread_messages_count}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {chatsLoading && chatsForCurrentTab.length > 0 && (
                                    <div className="chats-loading-more">Завантаження...</div>
                                )}
                            </>
                        )}
                    </div>
                </div>
                <div className="chats-content-area">
                    {(!chat && !pendingChatId) ? (
                        <div className="chats-select-placeholder">Оберіть чат</div>
                    ) : (
                        <div className="chats-chat-opened">
                            {(pendingChatId && !chat) ? (
                                <div className="chats-loading-container">
                                    <div className="chats-loading">Завантаження чату...</div>
                                </div>
                            ) : (
                                <>
                                    <div className="chats-chat-header">
                                        <Avatar
                                            src={chat?.avatar ? import.meta.env.VITE_APP_API_BASE_URL + chat.avatar : null}
                                            alt={chat?.user_first_name + " " + chat?.user_last_name}
                                            size={44}
                                            name={chat?.user_first_name}
                                            surname={chat?.user_last_name}
                                        />
                                        <div className="chats-chat-header-name">{chat?.user_first_name + " " + chat?.user_last_name}</div>
                                        <div style={{ flex: 1 }} />
                                        {selectedTab === "my" && (
                                            <div className="chat-header-actions">
                                                <button
                                                    className="chat-header-action return"
                                                    onClick={handleUnassign}
                                                    disabled={sending}
                                                    type="button"
                                                >
                                                    <img src={returnChatIcon} alt="" className="chat-header-icon icon-blue" />
                                                    <span>Повернути</span>
                                                </button>
                                                <button
                                                    className="chat-header-action close"
                                                    onClick={handleCloseChat}
                                                    type="button"
                                                    disabled={sending}
                                                >
                                                    <img src={closeChatIcon} alt="" className="chat-header-icon icon-red" />
                                                    <span>Закрити</span>
                                                </button>
                                            </div>
                                        )}
                                        {selectedTab === "general" && (
                                            <div className="chat-header-actions">
                                                <button
                                                    className="chat-header-action take"
                                                    onClick={handleAssign}
                                                    disabled={sending}
                                                    type="button"
                                                >
                                                    <img src={takeChatIcon} alt="" className="chat-header-icon icon-blue" />
                                                    <span>Взяти</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="chats-chat-messages">
                                        {messagesLoading ? (
                                            <div className="chats-loading">Завантаження...</div>
                                        ) : messagesError ? (
                                            <div className="chats-error">Помилка завантаження повідомлень</div>
                                        ) : (
                                            <>
                                                {messages
                                                    .sort((a, b) => new Date(a.sent_date).getTime() - new Date(b.sent_date).getTime())
                                                    .map((msg, idx) => {
                                                        const msgDate = new Date(msg.sent_date);
                                                        const prevMsg = messages[idx - 1];
                                                        const prevDate = prevMsg ? new Date(prevMsg.sent_date) : null;
                                                        const isNewDay =
                                                            !prevDate ||
                                                            msgDate.getFullYear() !== prevDate.getFullYear() ||
                                                            msgDate.getMonth() !== prevDate.getMonth() ||
                                                            msgDate.getDate() !== prevDate.getDate();

                                                        return (
                                                            <React.Fragment key={msg.chat_message_id}>
                                                                {isNewDay && (
                                                                    <div className="chats-chat-date">
                                                                        {msgDate.toLocaleDateString("uk-UA")}
                                                                    </div>
                                                                )}
                                                                <div className={`chats-chat-message-row ${msg.is_written_by_moderator ? "moderator" : "user"}`}>
                                                                    <div className={msg.is_written_by_moderator ? "chats-bubble-moderator" : "chats-bubble-user"}>
                                                                        {msg.text}
                                                                        <div className={`chats-message-time${msg.is_written_by_moderator ? ' moderator' : ''}`}>
                                                                            {msgDate.toLocaleTimeString("uk-UA", {
                                                                                hour: "2-digit",
                                                                                minute: "2-digit"
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                <div ref={messagesEndRef} />
                                            </>
                                        )}
                                    </div>
                                    {selectedTab === "my" && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }}
                                            className="chats-send-message-form chats-send-message-form--with-bg"
                                        >
                                           <textarea
                                               ref={textareaRef}
                                               value={messageInput}
                                               onChange={e => setMessageInput(e.target.value)}
                                               placeholder="Введіть повідомлення..."
                                               className="chats-send-message-input"
                                               disabled={sending}
                                               rows={1}
                                               style={{resize: "none", overflow: "hidden"}}
                                               onKeyDown={e => {
                                                   if (e.key === "Enter" && !e.shiftKey) {
                                                       e.preventDefault();
                                                       handleSendMessage();
                                                   }
                                               }}
                                           />
                                            <button
                                                type="submit"
                                                disabled={sending || !messageInput.trim()}
                                                className="send-btn"
                                            >
                                                <img src={sendIcon} alt="Відправити"/>
                                            </button>
                                        </form>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModeratorChatPage;
