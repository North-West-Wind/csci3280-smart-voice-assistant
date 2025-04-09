import OpenAI from "openai";
import { LLM, TypedMessage } from "../llm";
import { Command } from "../cmd";

export class DeepseekLLM extends LLM {
	private client: OpenAI;

	constructor(memory: number, duration: number, systemPromptFile: string) {
		super(memory, duration, systemPromptFile);

		this.client = new OpenAI({
			baseURL: "https://api.deepseek.com",
			apiKey: process.env.DEEPSEEK_KEY
		});
	}

	protected async chat(messages: TypedMessage[]) {
		let res = await this.client.chat.completions.create({
			messages: messages.map(msg => ({ role: msg.role as ("user" | "assistant" | "system"), content: msg.content })),
			model: "deepseek-chat",
			stream: true
		});
		let isChat = false, isThink = false, immThink = false;
		let content = "";
		for await (const part of res) {
			const word = part.choices[0].delta.content;
			if (!word) continue;
			content += word;
			if (word.includes("\n")) {
				const start = word.split("\n").pop()!.split(" ").shift()!;
				if (start.startsWith("/chat")) isChat = true;
				else if (start.startsWith("/") && Command.isValidCommand(start)) isChat = false;
				else if (start.startsWith("<think>")) isThink = true;
				else if (start.startsWith("</think>")) immThink = !(isThink = false);
			}
			this.emit("partial", word, isChat ? "chat" : (isThink || immThink ? "think" : "none"));
			immThink = false;
		}
		return content;
	}
}