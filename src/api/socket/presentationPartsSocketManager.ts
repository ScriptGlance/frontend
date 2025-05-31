import { SocketClient } from "../socketClient";

export enum OperationType {
    Retain = "retain",
    Insert = "insert",
    Delete = "delete",
}

export enum OperationTarget {
    Name = "name",
    Text = "text",
}

export enum EditingPresenceType {
    UserJoined = "user_joined",
    UserLeft = "user_left",
}

export enum PartEventType {
    PartAdded = "part_added",
    PartRemoved = "part_removed",
    PartUpdated = "part_updated",
}

export interface OperationComponent {
    type: OperationType;
    count?: number;
    text?: string;
    userId?: number;
}

export interface SubscribeTextPayload {
    presentationId: number;
}

export interface TextOperationsPayload {
    partId: number;
    baseVersion: number;
    operations: OperationComponent[];
    target: OperationTarget;
}

export interface CursorPositionChangePayload {
    part_id: number;
    cursor_position: number;
    selection_anchor_position: number | null;
    target: OperationTarget;
    user_id?: number;
}

export interface EditingPresence {
    user_id: number;
    type: EditingPresenceType;
}

export interface SubTextOperationsPayload extends TextOperationsPayload {
    userId: number;
    appliedVersion: number;
    socketId: string;
}

export interface PartEventPayload {
    event_type: PartEventType;
    part_id: number;
    part_order?: number;
    assignee_participant_id?: number;
}

export class PresentationPartsSocketManager {
    private socketClient: SocketClient;

    constructor(token: string) {
        this.socketClient = new SocketClient(token, import.meta.env.VITE_APP_BASE_SOCKET_URL + "/parts");
    }

    public subscribeText(presentationId: number) {
        this.socketClient.emit("subscribe_text", { presentationId });
    }

    public sendTextOperations(payload: TextOperationsPayload) {
        this.socketClient.emit("text_operations", payload);
    }

    public sendCursorPositionChange(payload: CursorPositionChangePayload) {
        this.socketClient.emit("cursor_position_change", payload);
    }

    public onEditingPresence(callback: (data: EditingPresence) => void) {
        this.socketClient.on("editing_presence", callback);
    }

    public offEditingPresence(callback: (data: EditingPresence) => void) {
        this.socketClient.off("editing_presence", callback);
    }

    public onTextOperations(callback: (data: SubTextOperationsPayload) => void) {
        this.socketClient.on("text_operations", callback);
    }

    public offTextOperations(callback: (data: SubTextOperationsPayload) => void) {
        this.socketClient.off("text_operations", callback);
    }

    public onCursorPositionChange(callback: (data: CursorPositionChangePayload) => void) {
        this.socketClient.on("cursor_position_change", callback);
    }

    public offCursorPositionChange(callback: (data: CursorPositionChangePayload) => void) {
        this.socketClient.off("cursor_position_change", callback);
    }

    public onPartEvent(callback: (data: PartEventPayload) => void) {
        this.socketClient.on("partEvent", callback);
    }

    public offPartEvent(callback: (data: PartEventPayload) => void) {
        this.socketClient.off("partEvent", callback);
    }

    public disconnect() {
        this.socketClient.disconnect();
    }

    public getSocketId(): string | undefined {
        return this.socketClient.getSocket()?.id;
    }
}
