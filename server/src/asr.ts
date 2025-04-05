import { EventEmitter } from "stream";
import { WebSocket } from "ws";

export declare interface ASR {
	on(event: "partial", listener: (partial: string) => void): this;
	on(event: "result", listener: (sentence: string) => void): this;
}

export abstract class ASR extends EventEmitter {
	protected websocket?: WebSocket;

	abstract start(): void;
	abstract stop(): void;

	attachWebsocket(websocket: WebSocket) {
		this.websocket = websocket;
	}
}