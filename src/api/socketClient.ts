import { io, Socket } from "socket.io-client";

export class SocketClient {
    private socket: Socket;

    constructor(token: string, url: string) {
        this.socket = io(url, {
            transports: ["websocket"],
            autoConnect: true,
            auth: { token: `${token}` },
        });
        this.socket.on("connect", () => {
            console.log("[SocketClient] Connected:", this.socket.id, "to", url);
        });
        this.socket.on("disconnect", (reason: string) => {
            console.log(`[SocketClient] Disconnected from ${url}: ${reason}`);
        });
        this.socket.on("connect_error", (err: any) => {
            console.error("[SocketClient] Connection error on", url, ":", err);
        });
    }

    public disconnect() {
        this.socket.disconnect();
    }

    public on(event: string, callback: (...args: any[]) => void) {
        this.socket.on(event, callback);
    }

    public off(event: string, callback: (...args: any[]) => void) {
        this.socket.off(event, callback);
    }

    public emit(event: string, ...args: any[]) {
        this.socket.emit(event, ...args);
    }

    public getSocket() {
        return this.socket;
    }
}
