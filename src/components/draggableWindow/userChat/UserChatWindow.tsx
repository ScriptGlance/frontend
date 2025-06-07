import React, { useState, useRef, useEffect, useCallback } from "react";
import { DraggableWindow } from "../base/DraggableWindow.tsx";
import "./UserChatWindow.css";
import closeIcon from "../../../assets/cross-icon-white.svg";
import sendIcon from "../../../assets/send-icon.svg";
import { useUserChatMessages } from "../../../hooks/useChat.ts";
import {useChatSocket} from "../../../hooks/useChatSocket.ts";
import {Role} from "../../../types/role.ts";

const CHAT_WIDTH = 400;
const CHAT_HEIGHT = 550;
const MESSAGES_LIMIT = 20;

interface UserChatWindowProps {
    visible: boolean;
    onClose: () => void;
}

export const UserChatWindow: React.FC<UserChatWindowProps> = ({
                                                                  visible,
                                                                  onClose,
                                                              }) => {
    const [input, setInput] = useState("");
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const chatBodyRef = useRef<HTMLDivElement | null>(null);

    const {
        messages,
        loading,
        error,
        hasMore,
        fetchMessages,
        sendMessage,
        markAsRead,
        setMessages,
        refetch,
        resetState,
    } = useUserChatMessages({ offset: 0, limit: MESSAGES_LIMIT });

    useEffect(() => {
        if (!visible) {
            setInput("");
            setIsAtBottom(true);
            setLoadingMore(false);
            setMessages([]);
            resetState?.();
            if (chatBodyRef.current) chatBodyRef.current.scrollTop = 0;
        }
    }, [visible, setMessages, resetState]);

    useEffect(() => {
        if (visible) {
            setMessages([]);
            refetch();
        }
        // eslint-disable-next-line
    }, [visible, setMessages, refetch]);



    const prevVisible = useRef(false);
    useEffect(() => {
        if (
            visible &&
            !prevVisible.current &&
            chatBodyRef.current &&
            messages.length > 0
        ) {
            setTimeout(() => {
                setTimeout(() => {
                    if (chatBodyRef.current) {
                        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
                    }
                }, 0);
            }, 0);
        }
        prevVisible.current = visible;
    }, [visible, messages.length]);

    const prevMsgCount = useRef(0);
    useEffect(() => {
        if (
            visible &&
            chatBodyRef.current &&
            messages.length > prevMsgCount.current &&
            isAtBottom
        ) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
        prevMsgCount.current = messages.length;
    }, [messages.length, visible, isAtBottom]);

    const wasVisible = useRef(false);

    useChatSocket({
        role: Role.User,
        onMessage: msg => {
            setMessages(prev =>
                prev.some(m => m.chat_message_id === msg.chat_message_id)
                    ? prev
                    : [...prev, { ...msg, self: !msg.is_written_by_moderator }]
            );
            if (wasVisible.current) markAsRead();
        },
        onChatClosed: onClose,
    });

    useEffect(() => {
        if (visible && !wasVisible.current) {
            markAsRead();
        }
        wasVisible.current = visible;
    }, [visible, markAsRead]);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || text.length > 1000) return;
        try {
            await sendMessage(text);
            setInput("");
        } catch (e) {}
    }, [input, sendMessage]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value.slice(0, 1000));
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSend();
        }
    };

    const handleScroll = async () => {
        if (!chatBodyRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
        setIsAtBottom(scrollHeight - (scrollTop + clientHeight) < 50);

        if (!loadingMore && hasMore && scrollTop === 0) {
            setLoadingMore(true);
            const prevScrollHeight = chatBodyRef.current.scrollHeight;
            const nextOffset = messages.length;
            await fetchMessages(nextOffset, true);
            setLoadingMore(false);

            setTimeout(() => {
                if (chatBodyRef.current) {
                    chatBodyRef.current.scrollTop =
                        chatBodyRef.current.scrollHeight - prevScrollHeight;
                }
            }, 0);
        }
    };

    return !visible ? null : (
        <DraggableWindow
            width={CHAT_WIDTH}
            initialPosition={{
                x: Math.max(0, Math.floor(window.innerWidth / 2 - CHAT_WIDTH / 2)),
                y: Math.max(0, Math.floor(window.innerHeight / 2 - CHAT_WIDTH / 2)),
            }}
            handleSelector=".user-chat-window__header"
            style={{
                height: CHAT_HEIGHT,
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(40,52,53,0.20)",
            }}
        >
            <div className="user-chat-window">
                <div className="user-chat-window__header">
                    <span>Підтримка</span>
                    <button className="user-chat-window__close" onClick={onClose}>
                        <img src={closeIcon} alt="Close" />
                    </button>
                </div>
                <div
                    className="user-chat-window__body"
                    ref={chatBodyRef}
                    style={{ overflowY: "auto", height: CHAT_HEIGHT - 104 }}
                    onScroll={handleScroll}
                >
                    {loading && <div style={{ textAlign: "center", color: "#999" }}>Завантаження…</div>}
                    {error && <div style={{ textAlign: "center", color: "red" }}>{error}</div>}
                    {!loading && messages.length === 0 && (
                        <div style={{ textAlign: "center", color: "#888", marginTop: 40 }}>У вас ще немає повідомлень</div>
                    )}

                    {loadingMore && (
                        <div style={{ textAlign: "center", color: "#999", marginBottom: 8 }}>
                            Завантаження…
                        </div>
                    )}

                    {[...messages]
                        .sort((a, b) => new Date(a.sent_date).getTime() - new Date(b.sent_date).getTime())
                        .map((msg, idx, arr) => {
                            const msgDate = msg.sent_date ? new Date(msg.sent_date) : null;
                            const prevMsg = arr[idx - 1];
                            const prevDate = prevMsg && prevMsg.sent_date ? new Date(prevMsg.sent_date) : null;
                            const isNewDay =
                                !prevDate ||
                                (msgDate &&
                                    prevDate &&
                                    (msgDate.getFullYear() !== prevDate.getFullYear() ||
                                        msgDate.getMonth() !== prevDate.getMonth() ||
                                        msgDate.getDate() !== prevDate.getDate()));

                            const isSelf = !msg.is_written_by_moderator;
                            const time = msg.sent_date
                                ? new Date(msg.sent_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                : "";
                            const dateStr = msg.sent_date
                                ? new Date(msg.sent_date).toLocaleDateString("uk-UA")
                                : "";

                            return (
                                <React.Fragment key={msg.chat_message_id || idx}>
                                    {isNewDay && (
                                        <div className="user-chat-window__date">{dateStr}</div>
                                    )}
                                    <div
                                        id={`chat-msg-${msg.chat_message_id}`}
                                        className={
                                            "user-chat-window__message" +
                                            (isSelf ? " self" : "")
                                        }
                                    >
                                        <div>{msg.text}</div>
                                        <span className="user-chat-window__time">{time}</span>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                </div>
                <div className="user-chat-window__footer">
                    <input
                        value={input}
                        onChange={handleInputChange}
                        className="user-chat-window__input"
                        placeholder="Введіть повідомлення..."
                        maxLength={1000}
                        onKeyDown={handleInputKeyDown}
                        disabled={loading}
                    />
                    <button
                        className="user-chat-window__send"
                        onClick={handleSend}
                        disabled={!input.trim() || input.length > 1000 || loading}
                    >
                        <img src={sendIcon} alt="Відправити" style={{ width: 26, height: 26 }} />
                    </button>
                </div>
            </div>
        </DraggableWindow>
    );
};
