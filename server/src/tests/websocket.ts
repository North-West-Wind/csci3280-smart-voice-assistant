import * as readline from "readline";
import { WebSocket } from "ws";

const client = new WebSocket("http://localhost:3280");

client.on("message", message => {
	console.log(message.toString());
});

const rl = readline.createInterface({
	input: process.stdin
});

rl.on("line", line => {
	client.send(line.trim());
});