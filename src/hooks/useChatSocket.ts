import { useEffect } from "react";
import ChatSocketManager, {
    NewMessageEvent,

} from "../api/socket/chatSocketManager";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import {ModeratorChatListItem} from "../api/repositories/chatRepository.ts";

const chatSocketManagers: { [role: string]: ChatSocketManager | undefined } = {};

export function getChatSocketManager(role: Role, token: string) {
    if (!chatSocketManagers[role]) {
        chatSocketManagers[role] = new ChatSocketManager(token);
    }
    return chatSocketManagers[role]!;
}

export function disconnectChatSocketManager(role: Role) {
    if (chatSocketManagers[role]) {
        chatSocketManagers[role]!.disconnect();
        delete chatSocketManagers[role];
    }
}

type UserChatHandlers = {
    role: Role.User;
    onMessage: (msg: NewMessageEvent) => void;
    onChatClosed: () => void;
};

type ModeratorChatHandlers = {
    role: Role;
    onMessage: (data: NewMessageEvent) => void;
    onChatClosed: (chat: ModeratorChatListItem) => void;
    onAssignmentChange: (chat: ModeratorChatListItem) => void;
};

type UseChatSocketProps = UserChatHandlers | ModeratorChatHandlers;

export function useChatSocket(props: UseChatSocketProps) {
    const { getToken } = useAuth();
    const token = getToken(props.role) || "";

    useEffect(() => {
        if (!token) return;
        const manager = getChatSocketManager(props.role, token);

        if (props.role === Role.User) {
            manager.joinUserChat();
            manager.onUserNewMessage(props.onMessage);
            manager.onUserChatClosed(props.onChatClosed as () => void);

            return () => {
                manager.offUserNewMessage(props.onMessage);
                manager.offUserChatClosed(props.onChatClosed as () => void);
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
            };
        }

        return () => {};
    }, [token, props]);
}
