import React, {useCallback, useEffect, useMemo, useRef, useState,} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../../hooks/useAuth";
import {Role} from "../../types/role";
import {
    useModeratorChatActions,
    useModeratorChatMessages,
    useModeratorChats,
    useModeratorUnreadCounts,
} from "../../hooks/useChat";
import {Avatar} from "../../components/avatar/Avatar";
import Logo from "../../components/logo/Logo";
import searchIcon from "../../assets/search.svg";
import RightHeaderButtons from "../../components/rightHeaderButtons/RightHeaderButtons.tsx";
import returnChatIcon from "../../assets/return-chat.svg";
import closeChatIcon from "../../assets/close-chat.svg";
import takeChatIcon from "../../assets/take-chat.svg";
import sendIcon from "../../assets/send-icon.svg";
import {ChatMessage, ModeratorChatListItem} from "../../api/repositories/chatRepository.ts";
import ConfirmationModal from "../../components/modals/deleteConfirmation/DeleteConfirmationModal.tsx";
import {disconnectChatSocketManager, useChatSocket} from "../../hooks/useChatSocket.ts";
import "./ModeratorChatPage.css";
import {NewMessageEvent} from "../../api/socket/chatSocketManager.ts";
import {useProfile} from "../../hooks/ProfileContext.tsx";
import {ModeratorProfile} from "../../api/repositories/profileRepository.ts";
import {Title} from "react-head";

type ChatTab = "my" | "general" | "history";

const CHAT_TABS: { label: string; value: ChatTab }[] = [
    { label: "Мої чати", value: "my" },
    { label: "Загальні чати", value: "general" },
    { label: "Історія", value: "history" },
];

const SELECTED_TAB_KEY = "moderator_selected_tab";
const LIMIT = 20;

function uniqueByMessageId(messages: any[]) {
    const seen = new Set();
    return messages.filter((message) => {
        if (seen.has(message.chat_message_id)) return false;
        seen.add(message.chat_message_id);
        return true;
    });
}

const ModeratorChatPage: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [selectedTab, setSelectedTab] = useState<ChatTab>(() => {
        const savedTab = localStorage.getItem(SELECTED_TAB_KEY);
        return savedTab === "my" || savedTab === "general" || savedTab === "history"
            ? (savedTab as ChatTab)
            : "my";
    });

    const [chat, setChat] = useState<ModeratorChatListItem | null>(null);
    const [pendingChatId, setPendingChatId] = useState<number | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [sending, setSending] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [closeChatModalOpen, setCloseChatModalOpen] = useState(false);
    const [hasTriedLoading, setHasTriedLoading] = useState(false);

    const chatRestoredRef = useRef(false);
    const scrollToBottomRef = useRef(false);

    const [generalChatsUnread, setGeneralChatsUnread] = useState(0);
    const [myChatsUnread, setMyChatsUnread] = useState(0);
    const { generalChatsUnread: fetchedGeneralChatsUnread, myChatsUnread: fetchedMyChatsUnread, refetch: refetchUnreadCounts } = useModeratorUnreadCounts();

    useEffect(() => {
        setGeneralChatsUnread(fetchedGeneralChatsUnread);
        setMyChatsUnread(fetchedMyChatsUnread);
    }, [fetchedGeneralChatsUnread, fetchedMyChatsUnread]);

    const {
        chats: myChats,
        loading: myChatsLoading,
        setSearch: setMyChatsSearch,
        offset: myChatsOffset,
        setOffset: setMyChatsOffset,
        setChats: setMyChatsDirectly,
        hasMore: hasMoreMyChats,
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
        setChats: setGeneralChatsDirectly,
        hasMore: hasMoreGeneralChats,
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
        setChats: setHistoryChatsDirectly,
        hasMore: hasMoreHistoryChats,
    } = useModeratorChats({
        type: "closed",
        initialSearch: selectedTab === "history" ? searchValue : "",
        limit: LIMIT,
        offset: 0,
    });

    const chatId = chat?.chat_id ?? null;
    const {
        messages,
        loadMore,
        hasMore,
        loading: messagesLoading,
        error: messagesError,
        setMessages,
    } = useModeratorChatMessages(chatId, LIMIT, Boolean(chatId));

    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevScrollHeightRef = useRef<number | null>(null);

    const chatsForCurrentTab = useMemo(() => {
        if (selectedTab === "my") return myChats;
        if (selectedTab === "general") return generalChats;
        if (selectedTab === "history") return historyChats;
        return [];
    }, [selectedTab, myChats, generalChats, historyChats]);
    let chatsLoading = false;
    if (selectedTab === "my") chatsLoading = myChatsLoading;
    if (selectedTab === "general") chatsLoading = generalChatsLoading;
    if (selectedTab === "history") chatsLoading = historyChatsLoading;

    useEffect(() => {
        if (chatRestoredRef.current || !pendingChatId) return;
        let chatToRestore: ModeratorChatListItem | undefined;
        if (selectedTab === "my" && !myChatsLoading && myChats.length > 0) {
            chatToRestore = myChats.find((c) => c.chat_id === pendingChatId);
        } else if (selectedTab === "general" && !generalChatsLoading && generalChats.length > 0) {
            chatToRestore = generalChats.find((c) => c.chat_id === pendingChatId);
        } else if (selectedTab === "history" && !historyChatsLoading && historyChats.length > 0) {
            chatToRestore = historyChats.find((c) => c.chat_id === pendingChatId);
        }
        if (chatToRestore) {
            setChat(chatToRestore);
            chatRestoredRef.current = true;
            setPendingChatId(null);
        }
    }, [
        pendingChatId,
        selectedTab,
        myChatsLoading,
        myChats,
        generalChatsLoading,
        generalChats,
        historyChatsLoading,
        historyChats,
    ]);

    useEffect(() => {
        localStorage.setItem(SELECTED_TAB_KEY, selectedTab);
    }, [selectedTab]);

    useEffect(() => {
        setHasTriedLoading(false);
    }, [selectedTab, searchValue]);
    useEffect(() => {
        if (!chatsLoading) setHasTriedLoading(true);
    }, [chatsLoading]);

    useEffect(() => {
        if (
            chat &&
            !myChats.some((c) => c.chat_id === chat.chat_id) &&
            !generalChats.some((c) => c.chat_id === chat.chat_id) &&
            !historyChats.some((c) => c.chat_id === chat.chat_id)
        ) {
            setChat(null);
        }
    }, [chat, myChats, generalChats, historyChats]);

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
        searchValue,
        selectedTab,
        setMyChatsSearch,
        setGeneralChatsSearch,
        setHistoryChatsSearch,
        setMyChatsOffset,
        setGeneralChatsOffset,
        setHistoryChatsOffset,
    ]);

    const { assignChat, unassignChat, closeChat, sendMessage, markAsRead } = useModeratorChatActions();

    const handleSocketMessage = useCallback((data: NewMessageEvent) => {
        if (data && data.chat_message_id) {
            const chatId = data.chat_id;

            const chatInHistory = historyChats.find(c => c.user_id === data.user_id);
            if (chatInHistory) {
                setHistoryChatsDirectly(prev => prev.filter(c => c.chat_id !== chatInHistory.chat_id));
                setGeneralChatsDirectly(prev => prev.some(c => c.user_id === data.user_id) ? prev : [
                    {
                        ...chatInHistory,
                        chat_id: data.chat_id!,
                        last_message: data.text,
                        last_message_sent_date: data.sent_date,
                        unread_messages_count: 1,
                    },
                    ...prev
                ]);
                if (selectedTab === "history" && chat?.user_id === data.user_id) {
                    setChat(null);
                }
            }

            if (chat && chat.chat_id === chatId) {
                const newMessage: ChatMessage = {
                    chat_message_id: data.chat_message_id,
                    user_id: data.user_id,
                    text: data.text,
                    is_written_by_moderator: data.is_written_by_moderator,
                    sent_date: data.sent_date,
                };
                setMessages(prev => uniqueByMessageId([...prev, newMessage]));
                scrollToBottomRef.current = true;
                if (selectedTab === "my") {
                    markAsRead(chatId).then(() => {
                        refetchUnreadCounts();
                    }).catch(console.error);
                }
            }

            const updateChatList = (setChatsFn: React.Dispatch<React.SetStateAction<ModeratorChatListItem[]>>) => {
                return setChatsFn(prevChats => {
                    const chatIndex = prevChats.findIndex(c => c.chat_id === chatId);
                    if (chatIndex === -1) return prevChats;

                    const updatedChats = [...prevChats];
                    const chatToUpdate = {...updatedChats[chatIndex]};

                    chatToUpdate.last_message = data.text;
                    chatToUpdate.last_message_sent_date = data.sent_date;

                    if (!data.is_written_by_moderator && (!chat || chat.chat_id !== chatId)) {
                        chatToUpdate.unread_messages_count += 1;
                    }

                    updatedChats.splice(chatIndex, 1);
                    updatedChats.unshift(chatToUpdate);

                    if (chat && chat.chat_id === chatId) {
                        setChat(chatToUpdate);
                    }

                    return updatedChats;
                });
            };

            updateChatList(setMyChatsDirectly);
            updateChatList(setGeneralChatsDirectly);
        }
    }, [chat, selectedTab, myChats, generalChats, historyChats, setMessages, markAsRead, setMyChatsDirectly, setGeneralChatsDirectly, setHistoryChatsDirectly, refetchUnreadCounts]
    );


    const handleSocketChatClose = useCallback(
        (closedChat: ModeratorChatListItem) => {
            const chatId = closedChat.chat_id;
            if (chat && chat.chat_id === chatId) {
                setChat(null);
            }

            const updateLists = () => {
                const findAndRemoveChat = (chats: ModeratorChatListItem[], setChatsFn: React.Dispatch<React.SetStateAction<ModeratorChatListItem[]>>) => {
                    const chatIndex = chats.findIndex(c => c.chat_id === chatId);
                    if (chatIndex === -1) return null;

                    const chatToMove = {...chats[chatIndex]};
                    setChatsFn(prev => prev.filter(c => c.chat_id !== chatId));

                    return chatToMove;
                };

                let chatToMove = findAndRemoveChat(myChats, setMyChatsDirectly);
                if (!chatToMove) {
                    chatToMove = findAndRemoveChat(generalChats, setGeneralChatsDirectly);
                }

                if (chatToMove) {
                    setHistoryChatsDirectly(prev => [chatToMove!, ...prev]);
                }
            };

            updateLists();
            refetchUnreadCounts();
        },
        [chat, myChats, generalChats, refetchUnreadCounts, setMyChatsDirectly, setGeneralChatsDirectly, setHistoryChatsDirectly]
    );

    const {profile} = useProfile(Role.Moderator);

    const handleSocketAssignmentChange = useCallback(
        (reassignedChat: ModeratorChatListItem) => {
            const chatId = reassignedChat.chat_id;
            const isAssigned = reassignedChat.assigned_moderator_id !== null;
            const isAssignedToMe = reassignedChat.assigned_moderator_id === (profile as ModeratorProfile).moderator_id;

            const isInMyChats = myChats.some(c => c.chat_id === chatId);
            const isInGeneralChats = generalChats.some(c => c.chat_id === chatId);

            if (isAssigned && isInGeneralChats) {
                setGeneralChatsDirectly(prev => prev.filter(c => c.chat_id !== chatId));
            }

            if (isAssigned && isAssignedToMe && !isInMyChats) {
                const chatToMove = generalChats.find(c => c.chat_id === chatId);
                if (chatToMove) {
                    setMyChatsDirectly(prev => prev.some(c => c.chat_id === chatId) ? prev : [chatToMove, ...prev]);
                }
            }

            if (isAssigned && chat && chat.chat_id === chatId && !isAssignedToMe) {
                setChat(null);
            }

            if (!isAssigned) {
                setMyChatsDirectly(prev => prev.filter(c => c.chat_id !== chatId));
                setGeneralChatsDirectly(prev => {
                    if (prev.some(c => c.chat_id === chatId)) return prev;
                    return [reassignedChat, ...prev];
                });
                if (chat && chat.chat_id === chatId) {
                    setChat(null);
                }
            }

            refetchUnreadCounts();
        },
        [
            profile,
            myChats,
            generalChats,
            setMyChatsDirectly,
            setGeneralChatsDirectly,
            chat,
            setChat,
            refetchUnreadCounts
        ]
    );



    useChatSocket({
        role: Role.Moderator,
        onMessage: handleSocketMessage,
        onChatClosed: handleSocketChatClose,
        onAssignmentChange: handleSocketAssignmentChange,
    });

    useEffect(() => {
        if (messagesEndRef.current && scrollToBottomRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "auto" });
            scrollToBottomRef.current = false;
        }
    }, [messages, messagesLoading]);

    useEffect(() => {
        if (prevScrollHeightRef.current !== null && messagesContainerRef.current) {
            const container = messagesContainerRef.current;
            const newScrollTop = container.scrollHeight - prevScrollHeightRef.current;

            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = newScrollTop;
                    prevScrollHeightRef.current = null;
                }
            }, 0);
        }
    }, [messages]);


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
                .then(() => {
                    if (chat) {
                        setMyChatsDirectly(prev =>
                            prev.map(c =>
                                c.chat_id === chatId
                                    ? {...c, unread_messages_count: 0}
                                    : c
                            )
                        );

                        if (chat.unread_messages_count > 0) {
                            setChat(prev => prev ? {...prev, unread_messages_count: 0} : null);
                        }
                    }
                    refetchUnreadCounts();
                })
                .catch(console.error);
        }
    }, [selectedTab, chatId, messages.length, markAsRead, chat, refetchUnreadCounts, setMyChatsDirectly]);

    useEffect(() => {
        markAsReadSentRef.current = null;
    }, [chatId, selectedTab]);

    const handleChatSelect = useCallback(
        (selectedChat: ModeratorChatListItem) => {
            if (chat?.chat_id === selectedChat.chat_id) return;
            setChat(selectedChat);
            scrollToBottomRef.current = true;
        },
        [chat?.chat_id]
    );

    const handleTabChange = useCallback((newTab: ChatTab) => {
        setSelectedTab(newTab);
        setChat(null);
        setMessageInput("");
        setSearchValue("");
        if (newTab === "my") setMyChatsOffset(0);
        if (newTab === "general") setGeneralChatsOffset(0);
        if (newTab === "history") setHistoryChatsOffset(0);
    }, []);

    const handleAssign = async () => {
        if (!chat) return;
        setSending(true);
        try {
            await assignChat(chat.chat_id);

            const chatToMove = {...chat};

            setGeneralChatsDirectly(prev =>
                prev.filter(c => c.chat_id !== chat.chat_id)
            );
            setMyChatsDirectly(prev => [chatToMove, ...prev]);

            setChat(chatToMove);

            if (selectedTab !== "my") {
                setSelectedTab("my");
            }

            refetchUnreadCounts();
        } finally {
            setSending(false);
        }
    };

    const handleUnassign = async () => {
        if (!chat) return;
        setSending(true);
        try {
            await unassignChat(chat.chat_id);

            const chatToMove = {...chat};

            setMyChatsDirectly(prev =>
                prev.filter(c => c.chat_id !== chat.chat_id)
            );

            setGeneralChatsDirectly(prev => [chatToMove, ...prev]);

            setChat(null);

            refetchUnreadCounts()
        } finally {
            setSending(false);
        }
    };

    const handleCloseChat = async () => {
        if (!chat) return;
        setSending(true);
        try {
            await closeChat(chat.chat_id);

            const chatToMove = {...chat};

            if (selectedTab === "my") {
                setMyChatsDirectly(prev =>
                    prev.filter(c => c.chat_id !== chat.chat_id)
                );
            } else if (selectedTab === "general") {
                setGeneralChatsDirectly(prev =>
                    prev.filter(c => c.chat_id !== chat.chat_id)
                );
            }

            setHistoryChatsDirectly(prev => [chatToMove, ...prev]);

            setChat(null);

            refetchUnreadCounts();
        } finally {
            setSending(false);
        }
    };

    const handleSendMessage = async () => {
        if (!chat || !messageInput.trim() || selectedTab !== "my") return;
        setSending(true);
        const messageText = messageInput.trim();
        try {
            await sendMessage(chat.chat_id, messageText);

            const newMessage: ChatMessage = {
                chat_message_id: Date.now(),
                user_id: 0,
                text: messageText,
                is_written_by_moderator: true,
                sent_date: new Date().toISOString()
            };

            setMessages(prev => [...prev, newMessage]);

            const updatedChat = {
                ...chat,
                last_message: messageText,
                last_message_sent_date: newMessage.sent_date
            };

            setMyChatsDirectly(prev => {
                const index = prev.findIndex(c => c.chat_id === chat.chat_id);
                if (index === -1) return prev;

                const updatedChats = [...prev];
                updatedChats.splice(index, 1);
                updatedChats.unshift(updatedChat);
                return updatedChats;
            });

            setChat(updatedChat);

            setMessageInput("");
            scrollToBottomRef.current = true;

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.style.height = "44px";
                    textareaRef.current.focus();
                }
            }, 100);
        } finally {
            setSending(false);
        }
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            const newHeight = Math.min(textarea.scrollHeight, 100);
            textarea.style.height = `${Math.max(44, newHeight)}px`;
        }
    }, [messageInput]);

    const handleLogout = () => {
        localStorage.removeItem(SELECTED_TAB_KEY);
        disconnectChatSocketManager(Role.Moderator);
        logout(Role.Moderator);
        navigate("/moderator/login");
    };

    const chatListRef = useRef<HTMLDivElement>(null);
    const handleScroll = useCallback(
        (e: React.UIEvent<HTMLDivElement>) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            if (scrollHeight - scrollTop - clientHeight < 50) {
                if (selectedTab === "my" && !myChatsLoading && myChats.length > 0 && hasMoreMyChats) {
                    setMyChatsOffset(myChatsOffset + LIMIT);
                } else if (selectedTab === "general" && !generalChatsLoading && generalChats.length > 0 && hasMoreGeneralChats) {
                    setGeneralChatsOffset(generalChatsOffset + LIMIT);
                } else if (selectedTab === "history" && !historyChatsLoading && historyChats.length > 0 && hasMoreHistoryChats) {
                    setHistoryChatsOffset(historyChatsOffset + LIMIT);
                }
            }
        },
        [
            selectedTab,
            myChatsLoading,
            myChatsOffset,
            setMyChatsOffset,
            myChats,
            hasMoreMyChats,
            generalChatsLoading,
            generalChatsOffset,
            setGeneralChatsOffset,
            generalChats,
            hasMoreGeneralChats,
            historyChatsLoading,
            historyChatsOffset,
            setHistoryChatsOffset,
            historyChats,
            hasMoreHistoryChats,
        ]
    );

    const handleMessagesScroll = useCallback(() => {
        if (
            messagesContainerRef.current &&
            messagesContainerRef.current.scrollTop < 50 &&
            hasMore &&
            !messagesLoading &&
            chatId &&
            !prevScrollHeightRef.current
        ) {
            prevScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
            loadMore();
        }
    }, [hasMore, messagesLoading, chatId, loadMore]);

    const handleShowCloseChatModal = () => setCloseChatModalOpen(true);
    const handleCloseChatModalCancel = () => setCloseChatModalOpen(false);
    const handleCloseChatModalConfirm = async () => {
        setCloseChatModalOpen(false);
        await handleCloseChat();
    };

    return (
        <div className="chats-main-container">
            <Title>Сторінка модератора – ScriptGlance</Title>
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
                                onChange={e => setSearchValue(e.target.value)}
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
                                {tab.value === "general" && (
                                    generalChatsUnread > 0 ?
                                        <span className="chats-general-count-badge">
                                        {generalChatsUnread}
                                    </span> : ""
                                )}
                                {tab.value === "my" && myChatsUnread > 0 && myChats.length > 0 && (
                                    <span className="chats-unread-messages-badge">{myChatsUnread}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="chats-list-scroll" ref={chatListRef} onScroll={handleScroll}>
                        {chatsLoading && chatsForCurrentTab.length === 0 && (
                            <div className="chats-loading">Завантаження...</div>
                        )}
                        {!chatsLoading && chatsForCurrentTab.length === 0 && hasTriedLoading && (
                            <div className="chats-empty-hint">Чатів не знайдено</div>
                        )}
                        {chatsForCurrentTab.length > 0 && (
                            <>
                                {chatsForCurrentTab.map(c => (
                                    <div
                                        key={c.chat_id}
                                        className={`chats-list-item${chat?.chat_id === c.chat_id ? " selected" : ""}`}
                                        onClick={() => handleChatSelect(c)}
                                    >
                                        <Avatar
                                            src={
                                                c.avatar
                                                    ? import.meta.env.VITE_APP_API_BASE_URL + c.avatar
                                                    : null
                                            }
                                            alt={c.user_first_name + " " + c.user_last_name}
                                            size={44}
                                            name={c.user_first_name}
                                            surname={c.user_last_name}
                                        />
                                        <div className="chats-list-item-info">
                                            <div className="chats-list-item-name">
                                                {c.user_first_name + " " + c.user_last_name}
                                            </div>
                                            <div className="chats-list-item-message">{c.last_message}</div>
                                        </div>
                                        <div className="chats-list-item-meta">
                                            <div className="chats-list-item-time">
                                                {c.last_message_sent_date &&
                                                    new Date(c.last_message_sent_date).toLocaleTimeString(
                                                        "uk-UA",
                                                        { hour: "2-digit", minute: "2-digit" }
                                                    )}
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
                    {!chat && !pendingChatId ? (
                        <div className="chats-select-placeholder">Оберіть чат</div>
                    ) : (
                        <div className="chats-chat-opened">
                            {pendingChatId && !chat ? (
                                <div className="chats-loading-container">
                                    <div className="chats-loading">Завантаження чату...</div>
                                </div>
                            ) : (
                                <>
                                    <div className="chats-chat-header">
                                        <Avatar
                                            src={
                                                chat?.avatar
                                                    ? import.meta.env.VITE_APP_API_BASE_URL + chat.avatar
                                                    : null
                                            }
                                            alt={chat?.user_first_name + " " + chat?.user_last_name}
                                            size={44}
                                            name={chat?.user_first_name}
                                            surname={chat?.user_last_name}
                                        />
                                        <div className="chats-chat-header-name">
                                            {chat?.user_first_name + " " + chat?.user_last_name}
                                        </div>
                                        <div style={{ flex: 1 }} />
                                        {selectedTab === "my" && (
                                            <div className="chat-header-actions">
                                                <button
                                                    className="chat-header-action return"
                                                    onClick={handleUnassign}
                                                    disabled={sending}
                                                    type="button"
                                                >
                                                    <img
                                                        src={returnChatIcon}
                                                        alt=""
                                                        className="chat-header-icon icon-blue"
                                                    />
                                                    <span>Повернути</span>
                                                </button>
                                                <button
                                                    className="chat-header-action close"
                                                    onClick={handleShowCloseChatModal}
                                                    type="button"
                                                    disabled={sending}
                                                >
                                                    <img
                                                        src={closeChatIcon}
                                                        alt=""
                                                        className="chat-header-icon icon-red"
                                                    />
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
                                                    <img
                                                        src={takeChatIcon}
                                                        alt=""
                                                        className="chat-header-icon icon-blue"
                                                    />
                                                    <span>Взяти</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className="chats-chat-messages"
                                        ref={messagesContainerRef}
                                        onScroll={handleMessagesScroll}
                                        style={{ overflowY: "auto", flex: 1 }}
                                    >
                                        {messagesLoading && messages.length === 0 ? (
                                            <div className="chats-loading">Завантаження...</div>
                                        ) : messagesError ? (
                                            <div className="chats-error">Помилка завантаження повідомлень</div>
                                        ) : (
                                            <>
                                                {uniqueByMessageId(messages)
                                                    .slice()
                                                    .sort(
                                                        (a, b) =>
                                                            new Date(a.sent_date).getTime() -
                                                            new Date(b.sent_date).getTime()
                                                    )
                                                    .map((msg, idx, arr) => {
                                                        const msgDate = new Date(msg.sent_date);
                                                        const prevMsg = arr[idx - 1];
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
                                                                <div
                                                                    className={`chats-chat-message-row ${
                                                                        msg.is_written_by_moderator ? "moderator" : "user"
                                                                    }`}
                                                                >
                                                                    <div
                                                                        className={
                                                                            msg.is_written_by_moderator
                                                                                ? "chats-bubble-moderator"
                                                                                : "chats-bubble-user"
                                                                        }
                                                                    >
                                                                        {msg.text}
                                                                        <div
                                                                            className={`chats-message-time${
                                                                                msg.is_written_by_moderator ? " moderator" : ""
                                                                            }`}
                                                                        >
                                                                            {msgDate.toLocaleTimeString("uk-UA", {
                                                                                hour: "2-digit",
                                                                                minute: "2-digit",
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
                                            onSubmit={e => {
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
                          maxLength={1000}
                          autoFocus
                          style={{ resize: "none", overflow: "hidden" }}
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
                                                <img src={sendIcon} alt="Відправити" />
                                            </button>
                                        </form>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <ConfirmationModal
                open={closeChatModalOpen}
                onClose={handleCloseChatModalCancel}
                onConfirm={handleCloseChatModalConfirm}
                confirmationTitle={
                    chat
                        ? `Ви впевнені, що хочете закрити чат з користувачем ${chat.user_first_name} ${chat.user_last_name}?`
                        : "Ви впевнені, що хочете закрити чат?"
                }
                cancelButtonText="Скасувати"
                confirmButtonText="Закрити чат"
                reloadAfterDelete={false}
            />
        </div>
    );
};

export default ModeratorChatPage;