import { prettyFormat } from "@imranbarbhuiya/duration";
import { Command } from "../cmd";

class RemindCommand extends Command {
	constructor() {
		super("remind", "Set a reminder for an event.", [{ name: "time", description: "the duration until the event happens." }, { name: "message", description: "the reminder message" }]);
	}

	async handle(message: string) {
		const split = message.split("|");
		if (split.length < 2) {
			return "Error! No duration specified, or cannot extract duration from command.";
		} else {
			const duration = split.shift()!;
			const event = split.join("|");
			const ms = (await import("parse-duration")).default(duration);
			if (ms) {
				setTimeout(() => {
					console.log(`Time's up for ${event}`);
				}, ms);
				return `Success! Set reminder for "${event}" in ${prettyFormat(ms)}`;
			} else {
				return `Error! "${duration}" is not a duration in the required format.`;
			}
		}
	}
}

export default new RemindCommand();