import { useEffect } from "react";
import { Role } from "../types/role.ts";
import { useAuth } from "./useAuth.ts";
import PaymentsSocketManager, {PaymentsEvent} from "../api/socket/paymentsSocketManager.ts";

export function usePaymentsSocket(onEvent: (event: PaymentsEvent) => void) {
    const { getToken } = useAuth();
    const token = getToken(Role.User) || "";

    useEffect(() => {
        PaymentsSocketManager.connect(token);
        PaymentsSocketManager.subscribePayments();
        PaymentsSocketManager.onPaymentsEvent(onEvent);

        return () => {
            PaymentsSocketManager.offPaymentsEvent(onEvent);
            PaymentsSocketManager.disconnect();
        };
    }, [onEvent, token]);
}
