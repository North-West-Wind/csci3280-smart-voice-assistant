import * as readline from "readline";
import { WebSocket } from "ws";

const clientSupplier = () => {
	const c = new WebSocket("http://localhost:3280");

	c.on("message", message => {
		console.log(message.toString());
	});

	return c;
}

let client = clientSupplier();

const rl = readline.createInterface({
	input: process.stdin
});

rl.on("line", line => {
	const command = line.trim();
	if (command == "reconnect") {
		client.close();
		client = clientSupplier();
	} else client.send(line.trim());
});