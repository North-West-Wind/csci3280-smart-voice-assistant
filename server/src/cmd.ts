export type WrappedResponse = {
	isRag: boolean;
	response: string;
}

export abstract class Command {
	static async handleResponse(message: string) {
		let outputs: WrappedResponse[] = [];
		for (const line of message.split("\n")) {
			const [key, value] = line.split(/\s+(.*)/s);
			if (commands.has(key)) {
				console.log("Calling", key);
				outputs.push(await commands.get(key)!.handleWrapper(value));
			} else outputs.push({ isRag: true, response: `Unknown command "${key}"` });
		}
		return outputs;
	}

	protected name: string;
	private notRag: boolean;

	constructor(name: string, notRag = false) {
		this.name = name;
		this.notRag = notRag;
		commands.set(name, this);
	}

	abstract handle(message: string): string | Promise<string>;

	private async handleWrapper(message: string): Promise<WrappedResponse> {
		if (this.notRag) return { isRag: false, response: await this.handle(message) };
		else return { isRag: true, response: `${this.responsePrefix(message)}${await this.handle(message)}` };
	}

	private responsePrefix(message: string) {
		return `Response from "${this.name} ${message}":\n\n`;
	}
}

const commands = new Map<string, Command>();