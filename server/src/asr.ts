import { EventEmitter } from "stream";
import { WebSocket } from "ws";

export declare interface ASR {
	on(event: "start", listener: () => void): this;
	on(event: "unsure", listener: (transcript: string) => void): this;
	on(event: "partial", listener: (transcript: string) => void): this;
	on(event: "result", listener: (transcript: string) => void): this;
}

export abstract class ASR extends EventEmitter {
	protected websocket?: WebSocket;

	abstract start(): void;
	abstract stop(): void;

	interrupt() {
		this.removeAllListeners();
	}

	attachWebsocket(websocket: WebSocket) {
		this.websocket = websocket;
	}
}