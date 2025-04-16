import { prettyFormat } from "@imranbarbhuiya/duration";
import { Command } from "../cmd";
import { sharedTTS, sharedWake } from "../shared";

// 2 hours and 30 minutes do something

const STOP_THRESHOLD = 2;

class RemindCommand extends Command {
	constructor() {
		super("remind", "Set a reminder for an event.", { time: "the duration until the event happens. Use full spellings for units.", message: "the reminder message" });
	}

	async handle(message: string) {
		const parse = (await import("parse-duration")).default;
		// find max length of args that allows duration parsing
		const split = message.split(" ");
		let durLen = 0;
		let duration = "";
		let lastDurs: number[] = [];
		let actualDur: number | undefined;
		for (let ii = 0; ii < split.length; ii++) {
			const word = split[ii];
			duration += " " + word;
			const ms = parse(duration);
			if (ms !== null) {
				durLen = ii + 1;
				if (actualDur !== undefined) {
					if (lastDurs.length >= STOP_THRESHOLD) lastDurs.shift();
					lastDurs.push(actualDur);
				}
				actualDur = ms;
				if (lastDurs.length == STOP_THRESHOLD && lastDurs.every(dur => actualDur === dur)) {
					durLen -= STOP_THRESHOLD;
					break;
				}
			}
		}
		if (actualDur === undefined) return "Error! Could not extract duration from command.";
		let event = split.slice(durLen).join(" ").trim();
		setTimeout(() => {
			sharedWake()?.lock();
			sharedTTS()?.process(event || "Time's up");
		}, actualDur);
		if (!event) return `Success! The timer will finish in ${prettyFormat(actualDur)}.`;
		return `Success! The timer for "${event}" will finish in ${prettyFormat(actualDur)}`;
	}
}

const remind = new RemindCommand();

export { remind };