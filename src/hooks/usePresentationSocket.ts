import { useEffect } from "react";
import presentationSocketManager, { PresentationEvent } from "../api/socket/presentationSocketManager";
import {Role} from "../types/role.ts";
import {useAuth} from "./useAuth.ts";

export function usePresentationSocket(presentationId: number, onEvent: (event: PresentationEvent) => void) {
    const { getToken } = useAuth();
    const token = getToken(Role.User) || "";

    useEffect(() => {
        presentationSocketManager.connect(token);

        presentationSocketManager.subscribePresentation(presentationId);
        presentationSocketManager.onPresentationEvent(onEvent);

        return () => {
            presentationSocketManager.offPresentationEvent(onEvent);
        };
    }, [presentationId, onEvent, token]);
}
