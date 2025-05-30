import { useEffect } from "react";
import chatSocketManager, {
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

    useEffect(() => {
        if (!token) return;

        chatSocketManager.connect(token);

        chatSocketManager.joinModeratorChats();

        chatSocketManager.onModeratorNewMessage(onMessage);
        chatSocketManager.onModeratorChatClosed(onChatClose);
        chatSocketManager.onAssignmentChange(onAssignmentChange);

        return () => {
            chatSocketManager.offModeratorNewMessage(onMessage);
            chatSocketManager.offModeratorChatClosed(onChatClose);
            chatSocketManager.offAssignmentChange(onAssignmentChange);
        };
    }, [token, onMessage, onChatClose, onAssignmentChange]);
}
