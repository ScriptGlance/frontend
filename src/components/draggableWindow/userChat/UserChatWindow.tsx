import React, { useState, useRef, useEffect, useCallback } from "react";
import { DraggableWindow } from "../base/DraggableWindow.tsx";
import "./UserChatWindow.css";
import closeIcon from "../../../assets/cross-icon-white.svg";
import ChatRepository from "../../../api/repositories/chatRepository.ts";
import { useAuth } from "../../../hooks/useAuth.ts";
import { useChatSocket } from "../../../hooks/useChatSocket.ts";
import { Role } from "../../../types/role";
import sendIcon from "../../../assets/send-icon.svg";

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
    const { getToken } = useAuth();

    const [messages, setMessages] = useState<any[]>([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const [input, setInput] = useState("");
    const chatBodyRef = useRef<HTMLDivElement | null>(null);

    const wasVisible = useRef(false);
    const markAsRead = useCallback(async () => {
        try {
            const token = getToken(Role.User);
            if (!token) return;
            await ChatRepository.markUserActiveChatAsRead(token);
        } catch {}
    }, [getToken]);

    useEffect(() => {
        if (visible && !wasVisible.current) {
            markAsRead();
        }
        wasVisible.current = visible;
    }, [visible, markAsRead]);

    useEffect(() => {
        if (visible) {
            setOffset(0);
            setHasMore(true);
            setMessages([]);
            setError(null);
            fetchMessages(0, false);
        }
        // eslint-disable-next-line
    }, [visible]);

    const fetchMessages = useCallback(
        async (currentOffset = 0, append = false) => {
            const token = getToken(Role.User);
            if (!token) return;

            if (currentOffset === 0) setLoading(true);
            else setLoadingMore(true);

            let prevScrollHeight = 0;
            if (append && chatBodyRef.current) {
                prevScrollHeight = chatBodyRef.current.scrollHeight;
            }

            try {
                setError(null);
                const data = await ChatRepository.getUserActiveChatMessages(token, {
                    offset: currentOffset,
                    limit: MESSAGES_LIMIT,
                });

                if (data) {
                    if (append) {
                        setMessages(prev => [...data, ...prev]);
                    } else {
                        setMessages(data);
                    }
                    setHasMore(data.length === MESSAGES_LIMIT);
                } else {
                    if (!append) setMessages([]);
                    setHasMore(false);
                }

                setTimeout(() => {
                    if (append && chatBodyRef.current) {
                        const newScrollHeight = chatBodyRef.current.scrollHeight;
                        chatBodyRef.current.scrollTop = newScrollHeight - prevScrollHeight;
                    }
                }, 0);
            } catch {
                setError("Не вдалося завантажити повідомлення");
                if (!append) setMessages([]);
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [getToken]
    );

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

    useEffect(() => {
        if (visible && chatBodyRef.current) {
            setTimeout(() => {
                chatBodyRef.current!.scrollTop = chatBodyRef.current!.scrollHeight;
            }, 0);
        }
    }, [visible]);

    const visibleRef = useRef(visible);
    useEffect(() => { visibleRef.current = visible; }, [visible]);

    useChatSocket({
        role: Role.User,
        onMessage: msg => {
            setMessages(prev =>
                prev.some(m => m.chat_message_id === msg.chat_message_id)
                    ? prev
                    : [...prev, { ...msg, self: !msg.is_written_by_moderator }]
            );
            if (visibleRef.current) markAsRead();
        },
        onChatClosed: onClose,
    });

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || text.length > 1000) return;
        try {
            const token = getToken(Role.User);
            if (!token) return;
            const msg = await ChatRepository.sendUserActiveChatMessage(token, text);
            setMessages(prev => [...prev, msg]);
            setInput("");
        } catch (e) {}
    }, [input, getToken]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value.slice(0, 1000));
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSend();
        }
    };

    const handleScroll = () => {
        if (!chatBodyRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
        setIsAtBottom(scrollHeight - (scrollTop + clientHeight) < 50);

        if (!loadingMore && hasMore && scrollTop === 0) {
            const nextOffset = offset + MESSAGES_LIMIT;
            setOffset(nextOffset);
            fetchMessages(nextOffset, true);
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