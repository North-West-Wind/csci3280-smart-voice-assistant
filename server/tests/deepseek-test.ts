import "dotenv/config";
import * as fs from "fs";
import { DeepseekLLM } from "../src/llm/deepseek";

fs.mkdirSync(__dirname + "/output", { recursive: true });

const none = fs.createWriteStream(__dirname + "/output/none.txt");
const think = fs.createWriteStream(__dirname + "/output/think.txt");
const chat = fs.createWriteStream(__dirname + "/output/chat.txt");

const llm = new DeepseekLLM(10, 300, __dirname + "/../system.txt");

llm.on("partial", (word, ctx) => {
	if (ctx == "none") none.write(word);
	else if (ctx == "think") think.write(word);
	else chat.write(word);
});

llm.on("line", (line) => {
	console.log(line);
});

llm.process("How do I make a cheese cake?");