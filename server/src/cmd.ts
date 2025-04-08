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
		for (const line of message.split("\n")) {
			const [key, value] = line.split(/\s+(.*)/s);
			if (this.commands.has(key)) {
				console.log("Calling", key);
				outputs.push(await this.commands.get(key)!.handleWrapper(value));
			} else outputs.push({ isRag: true, response: `Unknown command "${key}"` });
		}
		return outputs;
	}

	static generateSystemInstruction() {
		return "The following commands are available for you:\n"
			+ Array.from(this.commands.values()).map(cmd => cmd.usage()).join("\n");
	}

	static async init() {
		const chat = (await import("./cmd/chat")).default;
		this.commands.set(chat.name, chat);
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
			args = names.join(" ");
			argsDetail = descs.join(" ");
		}
		return `${this.name}${args} - ${this.description}${this.description.endsWith(".") ? "" : "."}${argsDetail}`
	}
}