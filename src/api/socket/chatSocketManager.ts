import {SocketClient} from "../socketClient.ts";

export enum ChatEventType {
    NewMessage = "new_message",
    ChatClosed = "chat_closed",
    AssignmentChange = "assignment_change",
}

export interface NewMessageEvent {
    chat_message_id: number;
    text: string;
    is_written_by_moderator: boolean;
    sent_date: string;
    chat_id?: number;
    user_full_name?: string;
    is_assigned?: boolean;
    is_new_chat?: boolean;
}

export interface AssignmentChangeEvent {
    chatId: number;
    isAssigned: boolean;
}

type EventCallback<T> = (event: T) => void;

class ChatSocketManager {
    private socketClient: SocketClient;

    constructor(token: string) {
        this.socketClient = new SocketClient(token, `${import.meta.env.VITE_APP_BASE_SOCKET_URL}/chats`);
    }

    public joinUserChat() {
        this.socketClient.emit("join_user_chat");
    }

    public onUserNewMessage(callback: EventCallback<NewMessageEvent>) {
        this.socketClient.on(ChatEventType.NewMessage, callback);
    }

    public offUserNewMessage(callback: EventCallback<NewMessageEvent>) {
        this.socketClient.off(ChatEventType.NewMessage, callback);
    }

    public onUserChatClosed(callback: () => void) {
        this.socketClient.on(ChatEventType.ChatClosed, callback);
    }

    public offUserChatClosed(callback: () => void) {
        this.socketClient.off(ChatEventType.ChatClosed, callback);
    }

    public joinModeratorChats() {
        this.socketClient.emit("join_moderator_chat");
    }

    public onModeratorNewMessage(callback: EventCallback<NewMessageEvent>) {
        this.socketClient.on(ChatEventType.NewMessage, callback);
    }

    public offModeratorNewMessage(callback: EventCallback<NewMessageEvent>) {
        this.socketClient.off(ChatEventType.NewMessage, callback);
    }

    public onModeratorChatClosed(callback: (chat?: any) => void) {
        this.socketClient.on(ChatEventType.ChatClosed, callback);
    }

    public offModeratorChatClosed(callback: (chat?: any) => void) {
        this.socketClient.off(ChatEventType.ChatClosed, callback);
    }

    public onAssignmentChange(callback: EventCallback<AssignmentChangeEvent>) {
        this.socketClient.on(ChatEventType.AssignmentChange, callback);
    }

    public offAssignmentChange(callback: EventCallback<AssignmentChangeEvent>) {
        this.socketClient.off(ChatEventType.AssignmentChange, callback);
    }

    public disconnect() {
        this.socketClient.disconnect();
    }
}

export default ChatSocketManager;