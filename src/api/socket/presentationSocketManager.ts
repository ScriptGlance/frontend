import socketClient from "../socketClient.ts";

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
    public connect(token: string) {
        socketClient.connect(token);
    }

    public subscribePresentation(presentationId: number) {
        socketClient.emit("subscribe_presentation", { presentationId });
    }

    public onPresentationEvent(callback: (event: PresentationEvent) => void) {
        socketClient.on("presentationEvent", callback);
    }

    public offPresentationEvent(callback: (event: PresentationEvent) => void) {
        socketClient.off("presentationEvent", callback);
    }

    public disconnect() {
        socketClient.disconnect();
    }
}

export default new PresentationSocketManager();
