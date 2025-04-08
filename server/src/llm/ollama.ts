import { Ollama } from "ollama";
import { LLM, TypedMessage } from "../llm";

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
				break;
			}
		}
		if (!exists) throw new Error(`Ollama model ${this.model} doesn't exist`);

		this.ready = true;
	}

	protected async chat(messages: TypedMessage[]) {
		let res = await this.ollama.chat({ model: this.model, messages, stream: true });
		let isFirst = true, isChat = false;
		let content = "";
		for await (const part of res) {
			content += part.message.content;
			if (isChat)
				this.emit("partial", part.message.content);
			if (part.message.content.includes("\n")) {
				isFirst = true;
				isChat = false;
			}
			if (isFirst && part.message.content.split("\n").pop()!.startsWith("chat")) {
				isFirst = false;
				isChat = true;
			}
		}
		return content;
	}
	
	async process(input: string) {
		if (!this.ready) throw new Error("OllamaLLM is not ready yet");
		await super.process(input);
	}
}