import { prettyFormat } from "@imranbarbhuiya/duration";
import { Command } from "../cmd";
import { parse, toSeconds } from "iso8601-duration";

class RemindCommand extends Command {
	constructor() {
		super("remind", "Set a reminder for an event.", [{ name: "time", description: "the duration (in ISO 8601 format) until the event happens." }, { name: "message", description: "the reminder message." }]);
	}

	handle(message: string) {
		const [duration, event] = message.split(/\s+(.*)/s);
		try {
			const secs = toSeconds(parse(duration));
			setTimeout(() => {
				console.log(`Time's up for ${event}`);
			}, secs * 1000);
			return `Set reminder for "${event}" in ${prettyFormat(secs * 1000)}`;
		} catch (err) {
			return `${duration} is not a valid ISO 8601 duration.`;
		}
	}
}

export default new RemindCommand();