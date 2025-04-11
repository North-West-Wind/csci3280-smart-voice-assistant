import "dotenv/config";
import { WebSocketServer } from "ws";
import { ASR } from "./asr";
import { Wake } from "./wake";
import { Option, program } from "commander";
import { LLM } from "./llm";
import { Command } from "./cmd";
import { TTS } from "./tts";

const WAKE_METHODS = ["manual", "openwakeword"];
const ASR_METHODS = ["whisper", "google"];
const LLM_METHODS = ["deepseek", "ollama"];
const TTS_METHODS = ["coqui", "google", "sapi4"];

program
	// wake word/trigger options
	.addOption(new Option("--wake <method>", "method for waking up the voice assistant").default("manual").choices(WAKE_METHODS))
	.option("--wakeword <model>", "(only for --wake openwakeword) model for wake word in tflite or onnx format", "./wakewords/summatia.tflite")
	// asr options
	.addOption(new Option("--asr <method>", "method for automatic speech recognition").default("whisper").choices(ASR_METHODS))
	.option("--whisper-model <model>", "(only for --asr whisper) model size for (faster) whisper", "base")
	.option("--faster-whisper", "(only for --asr whisper) use faster whisper implementation")
	// llm options
	.addOption(new Option("--llm <method>", "method for large-language model function calling and response").default("deepseek").choices(LLM_METHODS))
	.option("--memory-length <number>", "amount of messages to store as context", "20")
	.option("--memory-duration <number>", "amount of time (in seconds) to store the context", "60")
	.option("--system-prompt-file <path>", "path to a text file containing the system prompt template", "system.txt")
	.option("--ollama-host <url>", "(only for --llm ollama) host url of local ollama", "http://localhost:11434")
	.option("--ollama-model <model>", "(only for --llm ollama) ollama model to use")
	// tts options
	.addOption(new Option("--tts <method>", "method for text-to-speech").default("coqui").choices(TTS_METHODS))
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

// A lock in case of multiple clients
let locked = false;
const server = new WebSocketServer({ port });

server.on("connection", socket => {
	// Sockets will communicate using strings
	// When first connected, send status of components
	socket.send(`status ${!!wake} ${!!asr} ${!!llm} ${!!tts}`);

	const success = () => socket.send("success");
	const fail = (reason: string) => socket.send(`fail ${reason}`);

	socket.on("message", async message => {
		// Spin lock
		while (locked) {
			await new Promise(res => setTimeout(res, 100));
		}
		locked = true;

		// Get the first word of the message
		const args = message.toString("utf8").split(" ");
		const action = args.shift()!;

		switch (action) {
			// Trigger ASR to start listening
			case "trigger":
				if (!wake) fail("nowake")
				else {
					wake.emit("wake");
					success();
				}
				break;
			// List methods
			case "methods":
				if (args.length < 1) fail("args");
				else {
					switch (args.join(" ")) {
						case "wake":
							success();
							socket.send(`methods wake ${WAKE_METHODS.join(" ")}`);
							break;
						case "asr":
							success();
							socket.send(`methods asr ${ASR_METHODS.join(" ")}`);
							break;
						case "llm":
							success();
							socket.send(`methods llm ${LLM_METHODS.join(" ")}`);
							break;
						case "tts":
							success();
							socket.send(`methods tts ${TTS_METHODS.join(" ")}`);
							break;
						default:
							fail("invalid");
					}
				}
				break;
			// Status of components
			case "status":
				success();
				socket.send(`status ${!!wake} ${!!asr} ${!!llm} ${!!tts}`);
				break;
			// Set a new wake method
			case "set-wake":
				if (args.length < 1) fail("args");
				else if (await changeWake(args.join(" "))) success();
				else fail("invalid");
				break;
			// Set a new path to openwakeword model
			case "set-wake-word":
				if (args.length < 1) fail("args");
				else {
					const old = options.wakeword;
					options.wakeword = args.join(" ");
					if (await changeWake(activeWake)) success();
					else {
						options.wakeword = old;
						fail("invalid");
					}
				}
				break;
			// set asr method
			case "set-asr":
				if (args.length < 1) fail("args");
				else if (await changeASR(args.join(" "))) success();
				else fail("invalid");
				break;
			// set whisper model
			case "set-asr-model":
				if (args.length < 1) fail("args");
				else {
					const old = options.whisperModel;
					options.whisperModel = args.join(" ");
					if (await changeASR(activeAsr)) success();
					else {
						options.whisperModel = old;
						fail("invalid");
					}
				}
				break;
			// set whether to use faster whisper or not
			case "set-asr-faster":
				if (args.length < 1) fail("args");
				else {
					const old = options.fasterWhisper;
					if (args[0].toLowerCase() == "true") options.fasterWhisper = true;
					else if (args[0].toLowerCase() == "false") options.fasterWhisper = false;
					else {
						fail("invalid");
						break;
					}
					if (await changeASR(activeAsr)) success();
					else {
						options.fasterWhisper = old;
						fail("invalid");
					}
				}
				break;
			// set llm method
			case "set-llm":
				if (args.length < 1) fail("args");
				else if (await changeLLM(args.join(" "))) success();
				else fail("invalid");
				break;
			// set llm memory length/context or duration
			case "set-llm-mem-len":
			case "set-llm-mem-dur":
				if (args.length < 1) fail("args");
				else {
					const key = action == "set-llm-mem-len" ? "memoryLength" : "memoryDuration";
					const old = options[key];
					options[key] = parseInt(args.join(" "));
					if (isNaN(options[key])) {
						options[key] = old;
						fail("nan");
					} else if (await changeLLM(activeLlm)) success();
					else {
						options[key] = old;
						fail("invalid");
					}
				}
				break;
			case "set-llm-sys-prompt":
			case "set-llm-ollama-host":
			case "set-llm-ollama-model":
				if (args.length < 1) fail("args");
				else {
					const key = action == "set-llm-sys-prompt" ? "systemPromptFile" : (action == "set-llm-ollama-host" ? "ollamaHost" : "ollamaModel");
					const old = options[key];
					options[key] = args.join(" ");
					if (await changeLLM(activeLlm)) success();
					else {
						options[key] = old;
						fail("invalid");
					}
				}
				break;
			case "set-tts":
				if (args.length < 1) fail("args");
				else if (await changeTTS(args.join(" "))) success();
				else fail("invalid");
				break;
			case "set-tts-coqui-model":
				if (args.length < 1) fail("args");
				else {
					const old = options.coquiModel;
					options.coquiModel = args.join(" ");
					if (await changeTTS(activeTts)) success();
					else {
						options.coquiModel = old;
						fail("invalid");
					}
				}
				break;
			default:
				fail("unknown");
		}
		// Unlock when we are done
		locked = false;
	});

	socket.on("error", console.error);
});

/**
 * Components: Wake -> ASR -> LLM -> TTS
 * Each component has a few choices, mainly differing in local or remote
 */

// Declare variables
let wake: Wake | undefined;
let asr: ASR | undefined;
let llm: LLM | undefined;
let tts: TTS | undefined;

let activeWake = options.wake;
let activeAsr = options.asr;
let activeLlm = options.llm;
let activeTts = options.tts;

function stop() {
	wake?.interrupt();
	asr?.interrupt();
	llm?.interrupt();
}

// Setup wake word detection/manual trigger
async function changeWake(method: string) {
	try {
		if (wake) {
			wake.interrupt();
			wake = undefined;
		}
		switch (method) {
			case "openwakeword":
				const { OpenWakeWord } = await import("./wake/oww.js");
				wake = new OpenWakeWord(options.wakeword, options.python);
				break;
			case "manual":
				const { ManualWake } = await import("./wake/manual.js");
				wake = new ManualWake(server);
				break;
		}
		if (!wake) throw new Error("Wake or trigger method is invalid!");
		activeWake = method;

		wake.on("wake", () => {
			// If any of the components are not available, dont' do anything
			if (wake && asr && llm && tts) {
				wake.lock();
				asr.start();
			}
		});

		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

// Setup automatic speech recognition
async function changeASR(method: string) {
	try {
		if (asr) {
			asr.interrupt();
			asr = undefined;
		}
		
		switch (method) {
			case "whisper":
				const { LocalASR } = await import("./asr/local.js");
				asr = new LocalASR(options.whisperModel, options.fasterWhisper, options.forceDevice, options.python);
				break;
			case "google":
				const { GoogleASR } = await import("./asr/google.js");
				asr = new GoogleASR();
				break;
		}
		if (!asr) throw new Error("ASR method is invalid!");
		activeAsr = method;

		// When the transcription result is ready, pass it to LLM
		asr.on("result", result => {
			console.log(result);
			llm?.process(result);
		});
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

// Setup large language model
async function changeLLM(method: string) {
	try {
		if (llm) {
			llm.interrupt();
			llm = undefined;
		}

		switch (method) {
			case "ollama":
				const { OllamaLLM } = await import("./llm/ollama.js");
				llm = new OllamaLLM(parseInt(options.memoryLength), parseInt(options.memoryDuration), options.systemPromptFile, options.ollamaHost, options.ollamaModel);
				break;
			case "deepseek":
				const { DeepseekLLM } = await import("./llm/deepseek.js");
				llm = new DeepseekLLM(parseInt(options.memoryLength), parseInt(options.memoryDuration), options.systemPromptFile);
				break;
		}
		if (!llm) throw new Error("LLM method is invalid!");
		activeLlm = method;

		// LLM outputs, pass it to TTS
		llm.on("partial", (word, ctx) => {
			//console.log(`${ctx}: "${word}"`);
			if (ctx == "think") process.stdout.write(word);
		});
		//llm.on("line", line => {
		//	console.log(line);
		//});
		llm.on("result", () => {
			wake?.unlock();
		});
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

// Setup text to speech
async function changeTTS(method: string) {
	try {
		if (tts) {
			tts.interrupt();
			tts = undefined;
		}

		switch (method) {
			case "coqui":
				const { CoquiTTS } = await import("./tts/coqui.js");
				tts = new CoquiTTS(options.coquiModel, options.forceDevice, options.python);
				break;
		}
		if (!tts) throw new Error("TTS method is invalid!");
		activeTts = method;

		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

// When process is interrupted, pass the interrupt to modules as well
process.on("SIGINT", () => {
	console.log("Interupted. Shutting down...");
	stop();
	console.log("Done!");
	process.exit(0);
});

// Initialize all components
(async () => {
	// Initialize all the commands LLM can use
	await Command.init();

	await changeWake(options.wake);
	await changeASR(options.asr);
	await changeLLM(options.llm);
	await changeTTS(options.tts);
})();