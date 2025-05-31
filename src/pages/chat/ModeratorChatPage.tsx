import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Role } from "../../types/role";
import {
    type ModeratorChatListItem,
    useModeratorChatActions,
    useModeratorChats,
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

type ChatTab = "my" | "general" | "history";

const CHAT_TABS: { label: string; value: ChatTab }[] = [
    { label: "Мої чати", value: "my" },
    { label: "Загальні чати", value: "general" },
    { label: "Історія", value: "history" },
];

function upsertChat(
    list: ModeratorChatListItem[],
    msg: NewMessageEvent,
    getDefaults: (msg: NewMessageEvent) => Partial<ModeratorChatListItem> = () => ({})
): ModeratorChatListItem[] {
    const idx = list.findIndex(c => c.chat_id === msg.chat_id);
    if (idx === -1 && msg.chat_id) {
        let user_full_name = msg.user_full_name;
        console.log(msg);
        if (!user_full_name || user_full_name === "string" || user_full_name === "undefined undefined") {
            user_full_name = "Невідомий користувач";
        }
        return [
            {
                chat_id: msg.chat_id,
                user_full_name,
                avatar: null,
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
    const [selectedTab, setSelectedTab] = useState<ChatTab>("my");
    const [chat, setChat] = useState<ModeratorChatListItem | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [searchValue, setSearchValue] = useState("");
    const [sending, setSending] = useState(false);

    const myChatsParams = useMemo(() => ({ type: "assigned" as const, offset: 0, limit: 20 }), []);
    const generalChatsParams = useMemo(() => ({ type: "general" as const, offset: 0, limit: 20 }), []);
    const historyChatsParams = useMemo(() => ({ type: "closed" as const, offset: 0, limit: 20 }), []);

    const { chats: myChats, loading: myChatsLoading, refetch: refetchMyChats } = useModeratorChats(myChatsParams);
    const { chats: generalChats, loading: generalChatsLoading, refetch: refetchGeneralChats } = useModeratorChats(generalChatsParams);
    const { chats: historyChats, loading: historyChatsLoading, refetch: refetchHistoryChats } = useModeratorChats(historyChatsParams);

    const [localMyChats, setLocalMyChats] = useState<ModeratorChatListItem[]>([]);
    const [localGeneralChats, setLocalGeneralChats] = useState<ModeratorChatListItem[]>([]);
    const [localHistoryChats, setLocalHistoryChats] = useState<ModeratorChatListItem[]>([]);

    useEffect(() => {
        if (!myChatsLoading && Array.isArray(myChats)) setLocalMyChats(myChats);
    }, [myChats, myChatsLoading]);
    useEffect(() => {
        if (!generalChatsLoading && Array.isArray(generalChats)) setLocalGeneralChats(generalChats);
    }, [generalChats, generalChatsLoading]);
    useEffect(() => {
        if (!historyChatsLoading && Array.isArray(historyChats)) setLocalHistoryChats(historyChats);
    }, [historyChats, historyChatsLoading]);

    const myChatsUnread = useMemo(
        () => localMyChats.reduce((sum, c) => sum + (c.unread_messages_count || 0), 0),
        [localMyChats]
    );

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

    const { assignChat, unassignChat, closeChat, sendMessage, markAsRead } = useModeratorChatActions();

    const chatId = chat?.chat_id ?? null;

    const [messages, setMessages] = useState<NewMessageEvent[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);

    const { getToken } = useAuth();

    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            return;
        }
        setMessagesLoading(true);
        const token = getToken(Role.Moderator);
        fetch(`${import.meta.env.VITE_APP_API_BASE_URL}/chat/moderator/${chatId}/messages?offset=0&limit=40`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        })
            .then(res => res.json())
            .then(data => {
                setMessages(data.data || []);
            })
            .finally(() => setMessagesLoading(false));
    }, [chatId, getToken]);

    const updateChatListWithNewMessage = useCallback((msg: NewMessageEvent) => {
        setLocalMyChats(prev =>
            prev.map(c =>
                c.chat_id === msg.chat_id
                    ? { ...c, last_message: msg.text, last_message_sent_date: msg.sent_date }
                    : c
            )
        );
        setLocalGeneralChats(prev =>
            prev.map(c =>
                c.chat_id === msg.chat_id
                    ? { ...c, last_message: msg.text, last_message_sent_date: msg.sent_date }
                    : c
            )
        );
        setLocalHistoryChats(prev =>
            prev.map(c =>
                c.chat_id === msg.chat_id
                    ? { ...c, last_message: msg.text, last_message_sent_date: msg.sent_date }
                    : c
            )
        );
    }, []);

    const handleSocketMessage = useCallback((msg: NewMessageEvent) => {
        if (msg.chat_id === chatId) {
            setMessages(prev =>
                prev.some(m => m.chat_message_id === msg.chat_message_id)
                    ? prev
                    : [...prev, msg]
            );
        }

        setLocalGeneralChats(prev => upsertChat(prev, msg));
        setLocalMyChats(prev =>
            prev.map(c =>
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
            )
        );
        setLocalHistoryChats(prev =>
            prev.map(c =>
                c.chat_id === msg.chat_id
                    ? { ...c, last_message: msg.text, last_message_sent_date: msg.sent_date }
                    : c
            )
        );
    }, [chatId, selectedTab]);

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
    }, [chat, refetchMyChats, refetchGeneralChats, refetchHistoryChats]);

    const handleSocketAssignmentChange = useCallback(() => {
        refetchMyChats();
        refetchGeneralChats();
        refetchHistoryChats();
    }, [refetchMyChats, refetchGeneralChats, refetchHistoryChats]);

    useModeratorChatSocket(
        handleSocketMessage,
        handleSocketChatClose,
        handleSocketAssignmentChange
    );

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (messagesEndRef.current && messages.length > 0) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const alreadyMarkedAsRead = useRef<Set<number>>(new Set());
    useEffect(() => {
        if (selectedTab !== "my") return;
        if (
            chatId && chat && chat.unread_messages_count > 0 && messages.length > 0 &&
            !alreadyMarkedAsRead.current.has(chatId)
        ) {
            alreadyMarkedAsRead.current.add(chatId);
            markAsRead(chatId).catch(console.error);
        }
    }, [selectedTab, chatId, chat?.unread_messages_count, messages.length, markAsRead]);
    useEffect(() => {
        alreadyMarkedAsRead.current.clear();
    }, [chatId]);

    const handleChatSelect = useCallback((selectedChat: ModeratorChatListItem) => {
        if (chat?.chat_id === selectedChat.chat_id) return;
        setChat(selectedChat);
    }, [chat?.chat_id]);

    const handleTabChange = useCallback((newTab: ChatTab) => {
        setSelectedTab(newTab);
        setChat(null);
        setMessageInput("");
    }, []);

    const filteredChats = useMemo(() => {
        const chatsArray = Array.isArray(chatsForCurrentTab) ? chatsForCurrentTab : [];
        const search = searchValue.trim().toLowerCase();
        if (!search) return chatsArray;
        return chatsArray.filter((c) =>
            c.user_full_name.toLowerCase().includes(search) ||
            c.last_message?.toLowerCase().includes(search)
        );
    }, [chatsForCurrentTab, searchValue]);

    const handleAssign = async () => {
        if (!chat) return;
        setSending(true);
        try {
            await assignChat(chat.chat_id);
            setSelectedTab("my");
            setChat(null);
            await refetchMyChats();
            await refetchGeneralChats();
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
        } finally {
            setSending(false);
        }
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
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

            const newMsg: NewMessageEvent = {
                chat_message_id: Date.now(),
                text: messageText,
                is_written_by_moderator: true,
                sent_date: new Date().toISOString(),
                chat_id: chat.chat_id,
                user_full_name: "Ви"
            };

            setMessages(prev => [...prev, newMsg]);
            setMessageInput("");
            updateChatListWithNewMessage(newMsg);

            setLocalMyChats(prev => prev.map(c => c.chat_id === chat.chat_id ? { ...c, unread_messages_count: 0 } : c));
        } finally {
            setSending(false);
        }
    };

    const handleLogout = () => {
        logout(Role.Moderator);
        navigate("/login");
    };

    const handleLogoClick = () => {
        navigate("/dashboard");
    };

    return (
        <div className="chats-main-container">
            <div className="chats-header-bar">
                <Logo onClick={handleLogoClick} role={Role.Moderator} />
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
                                        {localGeneralChats.length}
                                    </span>
                                )}
                                {tab.value === "my" && myChatsUnread > 0 && (
                                    <span className="chats-unread-messages-badge">{myChatsUnread}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="chats-list-scroll">
                        {chatsLoading ? (
                            <div className="chats-loading">Завантаження...</div>
                        ) : !Array.isArray(filteredChats) || filteredChats.length === 0 ? (
                            <div className="chats-empty-hint">Чатів не знайдено</div>
                        ) : (
                            filteredChats.map((c) => (
                                <div
                                    key={c.chat_id}
                                    className={`chats-list-item${chat?.chat_id === c.chat_id ? " selected" : ""}`}
                                    onClick={() => handleChatSelect(c)}
                                >
                                    <Avatar
                                        src={c.avatar ? import.meta.env.VITE_APP_API_BASE_URL + c.avatar : null}
                                        alt={c.user_full_name}
                                        size={44}
                                    />
                                    <div className="chats-list-item-info">
                                        <div className="chats-list-item-name">{c.user_full_name}</div>
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
                            ))
                        )}
                    </div>
                </div>
                <div className="chats-content-area">
                    {!chat ? (
                        <div className="chats-select-placeholder">Оберіть чат</div>
                    ) : (
                        <div className="chats-chat-opened">
                            <div className="chats-chat-header">
                                <Avatar
                                    src={chat.avatar ? import.meta.env.VITE_APP_API_BASE_URL + chat.avatar : null}
                                    alt={chat.user_full_name}
                                    size={44}
                                />
                                <div className="chats-chat-header-name">{chat.user_full_name}</div>
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
                                        style={{ resize: "none", overflow: "hidden" }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || !messageInput.trim()}
                                        className="send-btn"
                                    >
                                        <img src={sendIcon} alt="Відправити" />
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModeratorChatPage;