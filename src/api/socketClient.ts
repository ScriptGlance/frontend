import { io, Socket } from "socket.io-client";

export class SocketClient {
    private readonly socket: Socket;

    constructor(token: string) {
        const baseUrl = import.meta.env.VITE_APP_BASE_SOCKET_URL;
        this.socket = io(baseUrl, {
            transports: ["websocket"],
            autoConnect: true,
            auth: { token },
        });

        this.registerDefaultListeners();
    }

    private registerDefaultListeners(): void {
        this.socket.on("connect", () => {
            console.log("[SocketClient] Connected:", this.socket.id);
        });

        this.socket.on("disconnect", (reason: string) => {
            console.log(`[SocketClient] Disconnected: ${reason}`);
        });

        this.socket.on("connect_error", (err: any) => {
            console.error("[SocketClient] Connection error:", err);
        });
    }

    public emit(event: string, ...args: any[]): void {
        console.log(`[SocketClient] Emitting event: ${event}`, args);
        this.socket.emit(event, ...args);
    }

    public on(event: string, callback: (...args: any[]) => void): void {
        console.log(`[SocketClient] Listening to event: ${event}`);
        this.socket.on(event, callback);
    }

    public off(event: string, callback: (...args: any[]) => void): void {
        console.log(`[SocketClient] Removing listener for event: ${event}`);
        this.socket.off(event, callback);
    }

    public disconnect(): void {
        console.log("[SocketClient] Disconnecting socket...");
        this.socket.disconnect();
    }

    public getSocket(): Socket {
        return this.socket;
    }
}
