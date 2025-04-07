import { Command } from "../cmd";

class ChatCommand extends Command {
	constructor() {
		super("chat", true);
	}

	handle(message: string) {
		return message;
	}
}

new ChatCommand();