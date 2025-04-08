import * as fs from "fs";
import { Message } from "ollama";
import { EventEmitter } from "stream";
import { Command } from "./cmd";

export type TypedMessage = Message & { type?: "req"|"res" };

export declare interface LLM {
	on(event: "partial", listener: (word: string) => void): this;
	on(event: "result", listener: (output: string) => void): this;
}

export abstract class LLM extends EventEmitter {
	private memory: number;
	private duration: number;
	private systemPrompt: Message;
	// runtime
	private messages: TypedMessage[] = [];
	private userMessages = 0;
	private forgetTimeout?: NodeJS.Timeout;

	constructor(memory: number, duration: number, systemPromptFile: string) {
		super();
		this.memory = memory;
		this.duration = duration;
		if (isNaN(this.memory)) throw new Error("memory length is not a number");
		if (isNaN(this.duration)) throw new Error("memory duration is not a number");

		if (!fs.existsSync(systemPromptFile)) throw new Error("system prompt file doesn't exist");
		const system = fs.readFileSync(systemPromptFile, { encoding: "utf8" }).replace(/{commands}/g, Command.generateSystemInstruction());
		this.systemPrompt = { role: "system", content: system };
	}

	protected abstract chat(messages: TypedMessage[]): Promise<string>;

	async process(input: string) {
			// auto-forget after some time
			if (this.forgetTimeout) this.forgetTimeout.refresh();
			else this.forgetTimeout = setTimeout(() => {
				this.messages = [];
			}, this.duration * 1000);
	
			this.messages.push({ role: "user", type: "req", content: input });
			this.userMessages++;
			while (this.userMessages > this.memory) {
				const first = this.messages.shift()!;
				if (first.role == "user" && first.type == "req") this.userMessages--;
			}
			let hasResponse = false;
			const chats: string[] = [];
			do {
				// don't forget in the middle of conversation!
				if (this.forgetTimeout) this.forgetTimeout.refresh();
				const message: Message = { role: "assistant", content: await this.chat([this.systemPrompt].concat(this.messages)) };
				this.messages.push(message);
				const responses = await Command.handleResponse(message.content);
				const filtered = responses.filter(response => {
					if (response.isRag) return true;
					chats.push(response.response);
					return false;
				});
				if (filtered.length) {
					this.messages.push({ role: "user", type: "res", content: filtered.map(res => res.response).join("\n\n") });
					hasResponse = true;
				} else hasResponse = false;
			} while (hasResponse);
			this.emit("result", chats.join("\n\n"));
	}
}