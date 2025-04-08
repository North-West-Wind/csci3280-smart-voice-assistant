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
		const lines = message.split("\n");
		for (let ii = 0; ii < lines.length; ii++) {
			const line = lines[ii];
			// This may be a command
			if (line.startsWith("/")) {
				const [key, value] = line.split(/\s+(.*)/s);
				const cmd = key.slice(1);
				if (this.commands.has(cmd)) {
					// This is a command
					let input = value;
					while (++ii < lines.length) {
						const line = lines[ii];
						if (line.startsWith("/")) {
							const [key, _] = line.split(/\s+(.*)/s);
							if (this.commands.has(key.slice(1))) {
								// This is a command. We will let next iteration handle it
								ii--;
								break;
							} else {
								input += "\n" + line;
							}
						}
					}
					console.log("Calling", key);
					outputs.push(await this.commands.get(cmd)!.handleWrapper(input));
				} else {
					// Assume everything uncaught to be chat
					outputs.push({ isRag: false, response: line });
				}
			} else {
				// Assume everything uncaught to be chat
				outputs.push({ isRag: false, response: line });
			}
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
			(await import("./cmd/lookup.js")).default.default,
			(await import("./cmd/remind.js")).default.default
		];
		commands.forEach(cmd => this.commands.set(cmd.name, cmd));
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
		else return { isRag: true, response: `${this.responsePrefix(message)}${await this.handle(message)}` };
	}

	private responsePrefix(message: string) {
		return `Response from "${this.name} ${message}":\n\n`;
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
			args = " " + names.join(" ");
			argsDetail = " " + descs.join(" ");
		}
		return `/${this.name}${args} - ${this.description}${this.description.endsWith(".") ? "" : "."}${argsDetail}`
	}
}