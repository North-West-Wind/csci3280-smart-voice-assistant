import "dotenv/config";
import { WebSocketServer } from "ws";
import { ASR } from "./asr";
import { Wake } from "./wake";
import { Option, program } from "commander";
import { LLM } from "./llm";
import { Command } from "./cmd";
import { TTS } from "./tts";

program
	// wake word/trigger options
	.addOption(new Option("--wake <method>", "method for waking up the voice assistant").default("manual").choices(["manual", "openwakeword"]))
	.option("--wakeword <model>", "(only for --wake openwakeword) model for wake word in tflite or onnx format", "./wakewords/summatia.tflite")
	// asr options
	.addOption(new Option("--asr <method>", "method for automatic speech recognition").default("whisper").choices(["whisper", "google"]))
	.option("--whisper-model <model>", "(only for --asr whisper) model size for (faster) whisper", "base")
	.option("--faster-whisper", "(only for --asr whisper) use faster whisper implementation")
	// llm options
	.addOption(new Option("--llm <method>", "method for large-language model function calling and response").default("deepseek").choices(["deepseek", "ollama"]))
	.option("--memory-length <number>", "amount of messages to store as context", "20")
	.option("--memory-duration <number>", "amount of time (in seconds) to store the context", "60")
	.option("--system-prompt-file <path>", "path to a text file containing the system prompt template", "system.txt")
	.option("--ollama-host <url>", "(only for --llm ollama) host url of local ollama", "http://localhost:11434")
	.option("--ollama-model <model>", "(only for --llm ollama) ollama model to use")
	// tts options
	.addOption(new Option("--tts <method>", "method for text-to-speech").default("coqui").choices(["coqui", "google", "sapi4"]))
	.option("--coqui-model <model>", "(only for --tts coqui) coqui tts model to use, or \"list\" to get a list of them", "tts_models/multilingual/multi-dataset/your_tts")
	// misc/common options
	.option("--python <path>", "path to a python virtual environment (venv) with all dependencies from requirements.txt installed")
	.option("--port <number>", "port number for the websocket server", "3280")
	.addOption(new Option("-d, --force-device <name>", "force-use this device for running models locally").choices(["cuda", "cpu"]));

program.parse();

const options = program.opts();

const DEFAULT_PORT = 3280;
let port = parseInt(options.port || process.env.PORT || DEFAULT_PORT.toString());
if (isNaN(port)) {
	console.log(`No port configured. Defaulting to port ${DEFAULT_PORT}...`);
	port = DEFAULT_PORT;
}

const server = new WebSocketServer({ port });

server.on("connection", socket => {
	// First message identifies the purpose of the socket
	socket.once("message", message => {
	});

	socket.on("error", console.error);
});

/**
 * Components: Wake -> ASR -> LLM -> TTS
 * Each component has a few choices, mainly differing in local or remote
 */
(async () => {
	// Initialize all the commands LLM can use
	await Command.init();

	// Setup wake word detection/manual trigger 
	let wake: Wake;
	if (options.wake == "openwakeword") {
		const { OpenWakeWord } = await import("./wake/oww.js");
		wake = new OpenWakeWord(options.wakeword, options.python);
	} else {
		const { ManualWake } = await import("./wake/manual.js");
		wake = new ManualWake(server);
	}
	// If the assistant is triggered, disable wake and start transcribing
	wake.on("wake", () => {
		wake.lock();
		asr.start();
	});
	
	// Setup automatic speech recognition
	let asr: ASR;
	if (options.asr == "whisper") {
		const { LocalASR } = await import("./asr/local.js");
		asr = new LocalASR(options.whisperModel, options.fasterWhisper, options.forceDevice, options.python);
	} else {
		const { GoogleASR } = await import("./asr/google.js");
		asr = new GoogleASR();
	}
	// When the transcription result is ready, pass it to LLM
	asr.on("result", result => {
		console.log(result);
		llm.process(result);
	});

	// Setup large language model
	let llm: LLM;
	if (options.llm == "ollama") {
		const { OllamaLLM } = await import("./llm/ollama.js");
		llm = new OllamaLLM(parseInt(options.memoryLength), parseInt(options.memoryDuration), options.systemPromptFile, options.ollamaHost, options.ollamaModel);
	} else {
		const { DeepseekLLM } = await import("./llm/deepseek.js");
		llm = new DeepseekLLM(parseInt(options.memoryLength), parseInt(options.memoryDuration), options.systemPromptFile);
	}
	// LLM outputs, pass it to TTS
	llm.on("partial", (word, ctx) => {
		//console.log(`${ctx}: "${word}"`);
		if (ctx == "think") process.stdout.write(word);
	});
	//llm.on("line", line => {
	//	console.log(line);
	//});
	llm.on("result", () => {
		wake.unlock();
	});

	// Setup text to speech
	let tts: TTS;
	if (options.tts == "coqui") {
		const { CoquiTTS } = await import("./tts/coqui.js");
		tts = new CoquiTTS(options.coquiModel, options.forceDevice, options.python);
	}

	// When process is interrupted, pass the interrupt to modules as well
	process.on("SIGINT", () => {
		console.log("Interupted. Shutting down...");
		wake.interrupt();
		asr.interrupt();
		console.log("Done!");
		process.exit(0);
	});
})();