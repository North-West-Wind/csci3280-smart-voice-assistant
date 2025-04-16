import OpenAI from "openai";
import { LLM, TypedMessage } from "../llm";
import { Command } from "../cmd";
import { endPunctuations } from "../shared";

export class DeepseekLLM extends LLM {
	private client: OpenAI;

	constructor(memory: number, duration: number, systemPromptFile: string) {
		super(memory, duration, systemPromptFile);

		if (!process.env.DEEPSEEK_KEY) throw new Error("No Deepseek API key found! Create a file named \".env\" under the \"server/\" directory and append \"DEEPSEEK_KEY=<key>\" to the file.");

		this.client = new OpenAI({
			baseURL: "https://api.deepseek.com",
			apiKey: process.env.DEEPSEEK_KEY
		});
	}

	protected async chat(messages: TypedMessage[]) {
		try {
			let res = await this.client.chat.completions.create({
				messages: messages.map(msg => ({ role: msg.role as ("user" | "assistant" | "system"), content: msg.content })),
				model: "deepseek-chat",
				stream: true
			});
			let isChat = false, notChat = false, isThink = false, immThink = false;
			let content = "", line = "", chatLine = "";
			for await (const part of res) {
				const token = part.choices[0].delta.content;
				if (typeof token != "string") continue;
				content += token;

				if (isChat) {
					chatLine += token;
					while (endPunctuations.some(punc => chatLine.includes(punc))) {
						const indices = endPunctuations.map(punc => chatLine.indexOf(punc)).filter(ii => ii >= 0);
						const min = indices.reduce((a, b) => Math.min(a, b));
						const char = chatLine.charAt(min);
						const split = chatLine.split(char);
						this.emit("line", split[0] + char);
						chatLine = split.slice(1).join(char).trim();
					}
				}

				if (token.includes("\n")) {
					const lineSplit = token.split("\n");
					const first = lineSplit.shift()!;
					const last = lineSplit.pop()!;
					
					// cut off the line
					line += first;
					if (isChat) {
						// in case token has multiple lines, emit them as well
						lineSplit.forEach(li => {
							if (li.startsWith("/chat") || (!li.startsWith("/") && isChat))
								this.emit("line", li.split(" ").slice(1).join(" "));
						});
					}
					line = last;
				} else line += token;

				const start = line.split(" ").shift()!;
				if (!isChat && start == "/chat") notChat = isChat = true;
				else if (start != "/chat" && start.startsWith("/") && Command.isValidCommand(start)) isChat = false;
				else if (start.startsWith("<think>")) isThink = true;
				else if (start.startsWith("</think>")) immThink = !(isThink = false);

				this.emit("partial", token, (isChat && !notChat) ? "chat" : (isThink || immThink ? "think" : "none"));
				notChat = false;
				immThink = false;
			}
			if (chatLine && isChat) this.emit("line", chatLine);
			return content;
		} catch (err: any) {
			if (typeof err.message == "string") return err.message;
			else if (typeof err == "string") return err;
			else return "An error has occured. Oops.";
		}
	}
}