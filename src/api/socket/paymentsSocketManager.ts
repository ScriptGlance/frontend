import socketClient from "../socketClient.ts";

export enum PaymentEventType {
    CARD_LINKED = "card_linked",
    TRANSACTION_UPDATED = "transaction_updated",
}

export interface PaymentsEvent {
    event_type: PaymentEventType;
}

class PaymentsSocketManager {
    public connect(token: string) {
        socketClient.connect(token);
    }

    public subscribePayments() {
        socketClient.emit("subscribe_payments");
    }

    public onPaymentsEvent(callback: (event: PaymentsEvent) => void) {
        socketClient.on("payments_event", callback);
    }

    public offPaymentsEvent(callback: (event: PaymentsEvent) => void) {
        socketClient.off("payments_event", callback);
    }

    public disconnect() {
        socketClient.disconnect();
    }
}

export default new PaymentsSocketManager();
