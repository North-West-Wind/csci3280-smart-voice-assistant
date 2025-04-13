export type WrappedResponse = {
	isRag: boolean;
	response: string;
}

export type Argument = {
	name: string;
	description: string;
}

export abstract class Command {
	static commands = new Map<string, Command>();

	static async handleResponse(message: string) {
		let outputs: WrappedResponse[] = [];
		let thinking = false;
		let currentCommand: Command | undefined;
		let input = "";
		const lines = message.split("\n");
		for (let ii = 0; ii < lines.length; ii++) {
			const line = lines[ii];
			if (line.trim() == "<think>") {
				// This is deepseek thinking
				thinking = true;
			} else if (line.trim() == "</think>") {
				// This is thinking done
				thinking = false;
			} else if (!thinking && line.startsWith("/")) {
				// This may be a command
				const [key, value] = line.split(/\s+(.*)/s);
				const cmd = key.slice(1);
				if (this.commands.has(cmd)) {
					// This is a command
					if (currentCommand) {
						// Process the previous command
						console.log("Calling", currentCommand.name);
						outputs.push(await currentCommand.handleWrapper(input));
					}
					currentCommand = this.commands.get(cmd)!;
					input = value;
				} else {
					// Not a command, so it's input
					input += "\n" + line;
				}
			} else if (!thinking) {
				// Absolutely not a command, so it's input
				input += "\n" + line;
			}
		}
		if (currentCommand) {
			console.log("Calling", currentCommand.name);
			outputs.push(await currentCommand.handleWrapper(input));
		}
		return outputs;
	}

	static generateSystemInstruction() {
		return "The following commands are available for you:\n"
			+ Array.from(this.commands.values()).map(cmd => cmd.usage()).join("\n");
	}

	static async init() {
		const commands: Command[] = [
			(await import("./cmd/chat.js")).default.default,
			// (await import("./cmd/lookup.js")).default.default, // lookup is too dangerous as it returns a lot of texts and can cost a lot on deepseek
			(await import("./cmd/remind.js")).default.default,
			(await import("./cmd/media.js")).play,
			(await import("./cmd/media.js")).stop,
		];
		commands.forEach(cmd => this.commands.set(cmd.name, cmd));
	}

	static isValidCommand(cmd: string) {
		if (cmd.startsWith("/")) cmd = cmd.slice(1);
		return this.commands.has(cmd);
	}

	readonly name: string;
	readonly description: string;
	readonly args: Argument[];
	private notRag: boolean;

	constructor(name: string, description: string, args: Argument[], notRag = false) {
		this.name = name;
		this.description = description.trim();
		this.args = args;
		this.notRag = notRag;
	}

	abstract handle(message: string): string | Promise<string>;

	private async handleWrapper(message: string): Promise<WrappedResponse> {
		if (this.notRag) return { isRag: false, response: await this.handle(message) };
		else return { isRag: true, response: `${this.responsePrefix()}${await this.handle(message)}` };
	}

	private responsePrefix() {
		return `Response from command "/${this.name}": `;
	}

	usage() {
		let args = "", argsDetail = "";
		if (this.args.length) {
			const names: string[] = [];
			const descs: string[] = [];
			this.args.forEach(arg => {
				arg.description = arg.description.trim();
				names.push(`{${arg.name}}`);
				descs.push(`Replace {${arg.name}} with ${arg.description}${arg.description.endsWith(".") ? "" : "."}`);
			});
			args = " " + names.join(" | ");
			argsDetail = " " + descs.join(" ") + (this.args.length > 1 ? " Seperate the arguments with \"|\"." : "");
		}
		return `/${this.name}${args} - ${this.description}${this.description.endsWith(".") ? "" : "."}${argsDetail}`
	}
}