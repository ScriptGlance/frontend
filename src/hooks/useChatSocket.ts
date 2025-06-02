import { useEffect, useRef } from "react";
import ChatSocketManager, {
    NewMessageEvent,
    AssignmentChangeEvent,
} from "../api/socket/chatSocketManager";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";

type UserChatHandlers = {
    role: Role.User;
    onMessage: (msg: NewMessageEvent) => void;
    onChatClosed: () => void;
};

type ModeratorChatHandlers = {
    role: Role.Moderator;
    onMessage: (msg: NewMessageEvent) => void;
    onChatClosed: (chat?: any) => void;
    onAssignmentChange: (event: AssignmentChangeEvent) => void;
};

type UseChatSocketProps = UserChatHandlers | ModeratorChatHandlers;

export function useChatSocket(props: UseChatSocketProps) {
    const { getToken } = useAuth();
    const token = getToken(props.role) || "";
    const chatSocketManagerRef = useRef<ChatSocketManager | null>(null);

    useEffect(() => {
        if (!token) return;

        const manager = new ChatSocketManager(token);
        chatSocketManagerRef.current = manager;

        if (props.role === Role.User) {
            manager.joinUserChat();
            manager.onUserNewMessage(props.onMessage);
            manager.onUserChatClosed(props.onChatClosed);

            return () => {
                manager.offUserNewMessage(props.onMessage);
                manager.offUserChatClosed(props.onChatClosed);
                manager.disconnect();
                chatSocketManagerRef.current = null;
            };
        }

        if (props.role === Role.Moderator) {
            manager.joinModeratorChats();
            manager.onModeratorNewMessage(props.onMessage);
            manager.onModeratorChatClosed(props.onChatClosed);
            manager.onAssignmentChange(props.onAssignmentChange);

            return () => {
                manager.offModeratorNewMessage(props.onMessage);
                manager.offModeratorChatClosed(props.onChatClosed);
                manager.offAssignmentChange(props.onAssignmentChange);
                manager.disconnect();
                chatSocketManagerRef.current = null;
            };
        }

        return () => {
            manager.disconnect();
            chatSocketManagerRef.current = null;
        };
        // eslint-disable-next-line
    }, [token, props]);
}
