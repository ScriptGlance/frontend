import { io, Socket } from "socket.io-client";

class SocketClient {
    private static instance: SocketClient;
    private socket: Socket | null = null;
    private connectedUrl: string | null = null;

    private constructor() {}

    public static getInstance(): SocketClient {
        if (!SocketClient.instance) {
            SocketClient.instance = new SocketClient();
        }
        return SocketClient.instance;
    }

    public connect(token: string, url?: string) {
        if (this.socket) {
            console.log("[SocketClient] Already connected.");
            return this.socket;
        }
        const socketUrl = url || import.meta.env.VITE_APP_BASE_SOCKET_URL;
        this.connectedUrl = socketUrl;
        console.log("[SocketClient] Connecting to:", socketUrl);
        this.socket = io(socketUrl, {
            transports: ["websocket"],
            autoConnect: true,
            auth: { token: `${token}` },
        });

        this.socket.on("connect", () => {
            console.log("[SocketClient] Connected:", this.socket?.id, "to", this.connectedUrl);
        });

        this.socket.on("disconnect", (reason: string) => {
            console.log(`[SocketClient] Disconnected: ${reason}`);
        });

        this.socket.on("connect_error", (err: any) => {
            console.error("[SocketClient] Connection error:", err);
        });

        return this.socket;
    }

    public disconnect() {
        if (this.socket) {
            console.log("[SocketClient] Disconnecting socket...");
            this.socket.disconnect();
            this.socket = null;
        } else {
            console.log("[SocketClient] No socket to disconnect.");
        }
        this.connectedUrl = null;
    }

    public on(event: string, callback: (...args: any[]) => void) {
        if (this.socket) {
            console.log(`[SocketClient] Listening to event: ${event}`);
            this.socket.on(event, callback);
        } else {
            console.warn(`[SocketClient] Tried to listen to event "${event}" but socket is not connected.`);
        }
    }

    public off(event: string, callback: (...args: any[]) => void) {
        if (this.socket) {
            console.log(`[SocketClient] Removing listener for event: ${event}`);
            this.socket.off(event, callback);
        } else {
            console.warn(`[SocketClient] Tried to remove listener for event "${event}" but socket is not connected.`);
        }
    }

    public emit(event: string, ...args: any[]) {
        if (this.socket) {
            console.log(`[SocketClient] Emitting event: ${event}`, args);
            this.socket.emit(event, ...args);
        } else {
            console.warn(`[SocketClient] Tried to emit event "${event}" but socket is not connected.`);
        }
    }

    public getSocket() {
        return this.socket;
    }
}

export default SocketClient.getInstance();
