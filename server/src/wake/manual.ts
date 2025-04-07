import { WebSocketServer } from "ws";
import { Wake } from "../wake";

// Manually wake up the assistant from the UI
export class ManualWake extends Wake {
	private server: WebSocketServer;

	constructor(server: WebSocketServer) {
		super();
		this.server = server;
	}

	lock() {
		// tmp implementation. frontend is missing
		this.server.clients.forEach(socket => socket.send("lock"));
	}

	unlock() {
		this.server.clients.forEach(socket => socket.send("unlock"));
	}

	interrupt() {
		
	}
}