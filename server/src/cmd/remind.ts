import { prettyFormat } from "@imranbarbhuiya/duration";
import { Command } from "../cmd";
import { sharedTTS, sharedWake } from "../shared";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const STOP_THRESHOLD = 2;

type Reminder = {
	time: number,
	event: string,
};

class RemindCommand extends Command {
	private reminders: Map<number, Reminder>;
	private counter: number;

	constructor() {
		super("remind", "Set a reminder for an event.", { time: "the duration until the event happens. Use full spellings for units.", message: "the reminder message" });

		this.reminders = new Map();
		this.counter = 0;

		try {
			mkdirSync("./runtime/", { recursive: true });
			if (existsSync("./runtime/reminders.json")) {
				const json = JSON.parse(readFileSync("./runtime/reminders.json", "utf8")) as Reminder[];
				for (const reminder of json) {
					if (reminder.time < Date.now()) continue;
					const id = this.counter++;
					this.reminders.set(id, reminder);
					setTimeout(() => {
						this.reminders.delete(id);
						sharedWake()?.lock();
						sharedTTS()?.process(reminder.event || "Time's up");
						this.saveToFile();
					}, reminder.time - Date.now());
				}
				this.saveToFile();
			}
		} catch (err) {
			// ignored
		}
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
		const id = this.counter++;
		this.reminders.set(id, { time: Date.now() + actualDur, event });
		setTimeout(() => {
			this.reminders.delete(id);
			sharedWake()?.lock();
			sharedTTS()?.process(event || "Time's up");
			this.saveToFile();
		}, actualDur);
		this.saveToFile();
		if (!event) return `Success! The timer will finish in ${prettyFormat(actualDur)}.`;
		return `Success! The timer for "${event}" will finish in ${prettyFormat(actualDur)}`;
	}

	private saveToFile() {
		mkdirSync("./runtime/", { recursive: true });
		writeFileSync("./runtime/reminders.json", JSON.stringify(Array.from(this.reminders.values())));
	}
}

const remind = new RemindCommand();

export { remind };