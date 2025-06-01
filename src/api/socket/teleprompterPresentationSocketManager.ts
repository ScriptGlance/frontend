import {SocketClient} from "../socketClient.ts";

export enum PresenceEventType {
    UserJoined = "user_joined",
    UserLeft = "user_left",
}

export enum PartReassignReason {
    MissingAssignee = "missing_assignee",
    AssigneeNotResponding = "assignee_not_responding",
}


export interface SubscribeTeleprompterPayload {
    presentationId: number;
}

export interface EmitReadingPositionPayload {
    position: number;
    presentationId: number;
}

export interface EmitRecordedVideosCountPayload {
    presentationId: number;
    notUploadedVideosInPresentation: number;
}

export interface TeleprompterPresencePayload {
    user_id: number;
    type: PresenceEventType;
}

export interface OwnerChangedPayload {
    current_owner_change_id: number;
}

export interface RecordingModeChangedPayload {
    user_id: number;
    is_recording_mode_active: boolean;
}

export interface RecordedVideosCountChangePayload {
    user_id: number;
    recorded_videos_count: number;
}

export interface PartReassignRequiredPayload {
    userId: number;
    partId: number;
    reason: PartReassignReason;
}

export interface WaitingForUserPayload {
    user_id: number;
}

export interface PartReadingConfirmationRequiredPayload {
    part_id: number;
    time_to_confirm_seconds: number;
    can_continue_from_last_position: boolean;
}

export interface IncomingReadingPositionPayload {
    partId: number;
    position: number;
}

export interface PartReassignedPayload {
    partId: number;
    userId: number;
}

export class TeleprompterPresentationSocketManager {
    private socketClient: SocketClient;

    constructor(token: string) {
        this.socketClient = new SocketClient(token, import.meta.env.VITE_APP_BASE_SOCKET_URL + "/teleprompter");
    }

    public subscribeToTeleprompter(payload: SubscribeTeleprompterPayload): void {
        this.socketClient.emit("subscribe_teleprompter", payload);
    }

    public sendReadingPosition(payload: EmitReadingPositionPayload): void {
        this.socketClient.emit("reading_position", payload);
    }

    public sendRecordedVideosCount(payload: EmitRecordedVideosCountPayload): void {
        this.socketClient.emit("recorded_videos_count", payload);
    }

    public onTeleprompterPresence(callback: (data: TeleprompterPresencePayload) => void): void {
        this.socketClient.on("teleprompter_presence", callback);
    }
    public offTeleprompterPresence(callback: (data: TeleprompterPresencePayload) => void): void {
        this.socketClient.off("teleprompter_presence", callback);
    }

    public onOwnerChanged(callback: (data: OwnerChangedPayload) => void): void {
        this.socketClient.on("owner_changed", callback);
    }
    public offOwnerChanged(callback: (data: OwnerChangedPayload) => void): void {
        this.socketClient.off("owner_changed", callback);
    }

    public onRecordingModeChanged(callback: (data: RecordingModeChangedPayload) => void): void {
        this.socketClient.on("recording_mode_changed", callback);
    }
    public offRecordingModeChanged(callback: (data: RecordingModeChangedPayload) => void): void {
        this.socketClient.off("recording_mode_changed", callback);
    }

    public onRecordedVideosCountChanged(callback: (data: RecordedVideosCountChangePayload) => void): void {
        this.socketClient.on("recorded_videos_count_change", callback);
    }
    public offRecordedVideosCountChanged(callback: (data: RecordedVideosCountChangePayload) => void): void {
        this.socketClient.off("recorded_videos_count_change", callback);
    }

    public onPartReassignRequired(callback: (data: PartReassignRequiredPayload) => void): void {
        this.socketClient.on("part_reassign_required", callback);
    }
    public offPartReassignRequired(callback: (data: PartReassignRequiredPayload) => void): void {
        this.socketClient.off("part_reassign_required", callback);
    }

    public onPartReassignCancelled(callback: () => void): void {
        this.socketClient.on("part_reassign_cancelled", callback);
    }
    public offPartReassignCancelled(callback: () => void): void {
        this.socketClient.off("part_reassign_cancelled", callback);
    }

    public onWaitingForUser(callback: (data: WaitingForUserPayload) => void): void {
        this.socketClient.on("waiting_for_user", callback);
    }
    public offWaitingForUser(callback: (data: WaitingForUserPayload) => void): void {
        this.socketClient.off("waiting_for_user", callback);
    }

    public onPartReadingConfirmationRequired(callback: (data: PartReadingConfirmationRequiredPayload) => void): void {
        this.socketClient.on("part_reading_confirmation_required", callback);
    }
    public offPartReadingConfirmationRequired(callback: (data: PartReadingConfirmationRequiredPayload) => void): void {
        this.socketClient.off("part_reading_confirmation_required", callback);
    }

    public onPartReadingConfirmationCancelled(callback: () => void): void {
        this.socketClient.on("part_reading_confirmation_cancelled", callback);
    }
    public offPartReadingConfirmationCancelled(callback: () => void): void {
        this.socketClient.off("part_reading_confirmation_cancelled", callback);
    }

    public onReadingPositionChanged(callback: (data: IncomingReadingPositionPayload) => void): void {
        this.socketClient.on("reading_position", callback);
    }
    public offReadingPositionChanged(callback: (data: IncomingReadingPositionPayload) => void): void {
        this.socketClient.off("reading_position", callback);
    }

    public onPartReassigned(callback: (data: PartReassignedPayload) => void): void {
        this.socketClient.on("part_reassigned", callback);
    }

    public offPartReassigned(callback: (data: PartReassignedPayload) => void): void {
        this.socketClient.off("part_reassigned", callback);
    }

    public onConnect(callback: () => void): void {
        this.socketClient.on("connect", callback);
    }
    public offConnect(callback: () => void): void {
        this.socketClient.off("connect", callback);
    }
    public onDisconnect(callback: (reason?: string) => void): void {
        this.socketClient.on("disconnect", callback);
    }
    public offDisconnect(callback: (reason?: string) => void): void {
        this.socketClient.off("disconnect", callback);
    }
    public onReconnectAttempt(callback: (attempt: number) => void): void {
        this.socketClient.on("reconnect_attempt", callback);
    }
    public offReconnectAttempt(callback: (attempt: number) => void): void {
        this.socketClient.off("reconnect_attempt", callback);
    }
    public onReconnect(callback: () => void): void {
        this.socketClient.on("reconnect", callback);
    }
    public offReconnect(callback: () => void): void {
        this.socketClient.off("reconnect", callback);
    }
    public onReconnectFailed(callback: () => void): void {
        this.socketClient.on("reconnect_failed", callback);
    }
    public offReconnectFailed(callback: () => void): void {
        this.socketClient.off("reconnect_failed", callback);
    }

    public disconnect(): void {
        this.socketClient.disconnect();
    }
}