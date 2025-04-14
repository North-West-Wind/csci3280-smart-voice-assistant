import * as fs from "fs";
import { Message } from "ollama";
import { EventEmitter } from "stream";
import { Command } from "./cmd";

export type TypedMessage = Message & { type?: "req"|"res" };

export declare interface LLM {
	on(event: "partial", listener: (word: string, context: "none" | "think" | "chat") => void): this;
	on(event: "line", listener: (line: string) => void): this;
	on(event: "result", listener: (output: string) => void): this;
}

export abstract class LLM extends EventEmitter {
	private memory: number;
	private duration: number;
	private systemPrompt: Message;
	private prefixMessages: Message[];
	// runtime
	private messages: TypedMessage[] = [];
	private userMessages = 0;
	private forgetTimeout?: NodeJS.Timeout;

	private interrupted = false;

	constructor(memory: number, duration: number, systemPromptFile: string) {
		super();
		this.memory = memory;
		this.duration = duration;
		if (isNaN(this.memory)) throw new Error("memory length is not a number");
		if (isNaN(this.duration)) throw new Error("memory duration is not a number");

		if (!fs.existsSync(systemPromptFile)) throw new Error("system prompt file doesn't exist");
		const system = fs.readFileSync(systemPromptFile, { encoding: "utf8" }).replace(/{commands}/g, Command.generateSystemInstruction());
		this.systemPrompt = { role: "system", content: system };
		this.prefixMessages = [this.systemPrompt, { role: "user", content: "Ping!" }, { role: "assistant", content: "/chat Pong!" }];
	}

	protected abstract chat(messages: TypedMessage[]): Promise<string>;

	async process(input: string) {
			// auto-forget after some time
			if (this.forgetTimeout) this.forgetTimeout.refresh();
			else this.forgetTimeout = setTimeout(() => {
				this.messages = [];
			}, this.duration * 1000);
	
			this.messages.push({ role: "user", type: "req", content: input.trim() });
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
				const message: Message = { role: "assistant", content: await this.chat(this.prefixMessages.concat(this.messages)) };
				//console.log(message.content);
				this.messages.push(message);
				const responses = await Command.handleResponse(message.content);
				if (!responses.length) {
					// if no command is called, the LLM is broken. just assume this is /chat
					// modify message content
					message.content = `/chat ${message.content}`;
					this.messages[this.messages.length - 1] = message;
					// redo response, and directly put result to chats
					const resp = await Command.handleResponse(message.content);
					chats.push(resp[0].response);
					this.emit("line", resp[0].response);
					hasResponse = false;
				} else {
					const cmdOutputs = responses.filter(response => {
						if (response.isRag) return true;
						chats.push(response.response);
						return false;
					});
					if (cmdOutputs.length) {
						this.messages.push({ role: "user", type: "res", content: cmdOutputs.map(res => res.response).join("\n\n") });
						hasResponse = true;
					} else hasResponse = false;
				}
			} while (hasResponse && !this.interrupted);
			this.emit("result", chats.join("\n\n"));
	}

	interrupt() {
		this.removeAllListeners();
		this.interrupted = true;
	}
}