import { Command } from "../cmd";

class ChatCommand extends Command {
	constructor() {
		super("chat", "Send a text message.", { message: "the message you want to send." }, true);
	}

	handle(message: string) {
		return message;
	}
}

const chat = new ChatCommand();

export { chat }