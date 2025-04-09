import { Ollama } from "ollama";
import { LLM, TypedMessage } from "../llm";
import { Command } from "../cmd";

export class OllamaLLM extends LLM {
	private ready: boolean;
	private ollama: Ollama;
	private model: string;

	constructor(memory: number, duration: number, systemPromptFile: string, ollamaHost: string, model: string) {
		super(memory, duration, systemPromptFile);
		this.ready = false;
		this.ollama = new Ollama({ host: ollamaHost });
		this.model = model;
		this.ensureModel();
	}

	async ensureModel() {
		let exists = false;
		for (const model of (await this.ollama.list()).models) {
			let name = model.name;
			if (!this.model.includes(":")) name = name.split(":")[0];
			if (name == this.model) {
				exists = true;
				this.model = model.name;
				break;
			}
		}
		if (!exists) throw new Error(`Ollama model ${this.model} doesn't exist`);

		this.ready = true;
	}

	protected async chat(messages: TypedMessage[]) {
		let res = await this.ollama.chat({ model: this.model, messages, stream: true });
		let isChat = false, isThink = false, immThink = false;
		let content = "";
		for await (const part of res) {
			content += part.message.content;
			if (part.message.content.includes("\n")) {
				const start = part.message.content.split("\n").pop()!.split(" ").shift()!;
				if (start.startsWith("/chat")) isChat = true;
				else if (start.startsWith("/") && Command.isValidCommand(start)) isChat = false;
				else if (start.startsWith("<think>")) isThink = true;
				else if (start.startsWith("</think>")) immThink = !(isThink = false);
			}
			this.emit("partial", part.message.content, isChat ? "chat" : (isThink || immThink ? "think" : "none"));
			immThink = false;
		}
		return content;
	}
	
	async process(input: string) {
		if (!this.ready) throw new Error("OllamaLLM is not ready yet");
		await super.process(input);
	}
}