import {SocketClient} from "../socketClient.ts";

export enum PaymentEventType {
    CARD_LINKED = "card_linked",
    TRANSACTION_UPDATED = "transaction_updated",
}

export interface PaymentsEvent {
    event_type: PaymentEventType;
}

export class PaymentsSocketManager {
    private socketClient: SocketClient;

    constructor(token: string) {
        this.socketClient = new SocketClient(token, import.meta.env.VITE_APP_BASE_SOCKET_URL + "/payments");
    }

    public subscribePayments(): void {
        this.socketClient.emit("subscribe_payments");
    }

    public onPaymentsEvent(callback: (event: PaymentsEvent) => void): void {
        this.socketClient.on("payments_event", callback);
    }

    public offPaymentsEvent(callback: (event: PaymentsEvent) => void): void {
        this.socketClient.off("payments_event", callback);
    }

    public disconnect(): void {
        this.socketClient.disconnect();
    }
}
