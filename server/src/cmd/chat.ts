import { Command } from "../cmd";

class ChatCommand extends Command {
	constructor() {
		super("chat", "Send an actual text message.", [{ name: "message", description: "the message you want to send." }], true);
	}

	handle(message: string) {
		return message;
	}
}

export default new ChatCommand();