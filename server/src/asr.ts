import { EventEmitter } from "stream";
import { WebSocket } from "ws";

export declare interface ASR {
	on(event: "unsure", listener: (transcript: string) => void): this;
	on(event: "result", listener: (transcript: string) => void): this;
}

export abstract class ASR extends EventEmitter {
	protected websocket?: WebSocket;

	abstract start(): void;
	abstract stop(): void;

	abstract interrupt(): void;

	attachWebsocket(websocket: WebSocket) {
		this.websocket = websocket;
	}
}