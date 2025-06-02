import {SocketClient} from "../socketClient.ts";

export enum PresentationEventType {
    NameChanged = "name_changed",
    ParticipantsChanged = "participants_changed",
    VideosChanged = "videos_changed",
    TextChanged = "text_changed",
    PresentationStarted = "presentation_started",
    PresentationStopped = "presentation_stopped",
    JoinedUsersChanged = "joined_users_changed",
}

export interface PresentationEvent {
    event_type: PresentationEventType;
}

class PresentationSocketManager {
    private socketClient: SocketClient;

    constructor(token: string) {
        this.socketClient = new SocketClient(token, import.meta.env.VITE_APP_BASE_SOCKET_URL + "/presentations");
    }

    public subscribePresentation(presentationId: number): void {
        this.socketClient.emit("subscribe_presentation", {presentationId});
    }

    public onPresentationEvent(callback: (event: PresentationEvent) => void): void {
        this.socketClient.on("presentationEvent", callback);
    }

    public offPresentationEvent(callback: (event: PresentationEvent) => void): void {
        this.socketClient.off("presentationEvent", callback);
    }

    public disconnect(): void {
        this.socketClient.disconnect();
    }
}

export default PresentationSocketManager;
