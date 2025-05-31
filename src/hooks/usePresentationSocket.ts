import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import PresentationSocketManager, {PresentationEvent} from "../api/socket/presentationSocketManager.ts";

export function usePresentationSocket(
    presentationId: number,
    onEvent: (event: PresentationEvent) => void
) {
    const { getToken } = useAuth();
    const token = getToken(Role.User) || "";
    const socketManagerRef = useRef<InstanceType<typeof PresentationSocketManager> | null>(null);

    const stableCallbackRef = useRef(onEvent);
    useEffect(() => {
        stableCallbackRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        if (!socketManagerRef.current) {
            socketManagerRef.current = new PresentationSocketManager(token);
        }

        const manager = socketManagerRef.current;
        manager.subscribePresentation(presentationId);

        const handler = (event: PresentationEvent) => stableCallbackRef.current(event);
        manager.onPresentationEvent(handler);

        return () => {
            manager.offPresentationEvent(handler);
            manager.disconnect();
            socketManagerRef.current = null;
        };
    }, [presentationId, token]);
}
