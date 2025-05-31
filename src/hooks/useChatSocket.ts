import { useEffect, useRef } from "react";
import ChatSocketManager, {
    NewMessageEvent,
    AssignmentChangeEvent,
} from "../api/socket/chatSocketManager";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";

export function useModeratorChatSocket(
    onMessage: (msg: NewMessageEvent) => void,
    onChatClose: (chat?: any) => void,
    onAssignmentChange: (event: AssignmentChangeEvent) => void
) {
    const { getToken } = useAuth();
    const token = getToken(Role.Moderator) || "";

    const chatSocketManagerRef = useRef<ChatSocketManager | null>(null);

    useEffect(() => {
        if (!token) return;

        const manager = new ChatSocketManager(token);
        chatSocketManagerRef.current = manager;

        manager.joinModeratorChats();

        manager.onModeratorNewMessage(onMessage);
        manager.onModeratorChatClosed(onChatClose);
        manager.onAssignmentChange(onAssignmentChange);

        return () => {
            manager.offModeratorNewMessage(onMessage);
            manager.offModeratorChatClosed(onChatClose);
            manager.offAssignmentChange(onAssignmentChange);
            manager.disconnect();
            chatSocketManagerRef.current = null;
        };
    }, [token, onMessage, onChatClose, onAssignmentChange]);
}
