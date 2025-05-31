import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";
import { Role } from "../types/role";
import {PaymentsEvent, PaymentsSocketManager} from "../api/socket/paymentsSocketManager.ts";

export function usePaymentsSocket(onEvent: (event: PaymentsEvent) => void) {
    const { getToken } = useAuth();
    const token = getToken(Role.User) || "";

    const socketManagerRef = useRef<PaymentsSocketManager | null>(null);
    const stableCallbackRef = useRef(onEvent);

    useEffect(() => {
        stableCallbackRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        const manager = new PaymentsSocketManager(token);
        socketManagerRef.current = manager;

        const handler = (event: PaymentsEvent) => stableCallbackRef.current(event);

        manager.subscribePayments();
        manager.onPaymentsEvent(handler);

        return () => {
            manager.offPaymentsEvent(handler);
            manager.disconnect();
            socketManagerRef.current = null;
        };
    }, [token]);
}
