import "dotenv/config";
import { WebSocketServer } from "ws";
import { ASR } from "./asr";
import { Wake } from "./wake";
import { Option, program } from "commander";
import { LLM } from "./llm";
import { Command } from "./cmd";
import { TTS } from "./tts";
import { sharedTTS, sharedWake } from "./shared";

const WAKE_METHODS = ["manual", "openwakeword"];
const ASR_METHODS = ["whisper", "google"];
const LLM_METHODS = ["deepseek", "ollama"];
const TTS_METHODS = ["coqui", "google"];

program
	// wake word/trigger options
	.addOption(new Option("--wake <method>", "method for waking up the voice assistant").default("manual").choices(WAKE_METHODS))
	.option("--wakeword <model>", "(only for --wake openwakeword) model for wake word in tflite or onnx format", "./wakewords/summatia.tflite")
	// asr options
	.addOption(new Option("--asr <method>", "method for automatic speech recognition").default("whisper").choices(ASR_METHODS))
	.option("--silence-threshold <number>", "seconds of silence before asr stop listening", "1.5")
	.option("--whisper-model <model>", "(only for --asr whisper) model size for (faster) whisper", "base")
	.option("--faster-whisper", "(only for --asr whisper) use faster whisper implementation")
	.addOption(new Option("--whisper-device <name>", "(only for --asr whisper) force-use this device for running whisper").choices(["cuda", "cpu"]))
	// llm options
	.addOption(new Option("--llm <method>", "method for large-language model function calling and response").default("deepseek").choices(LLM_METHODS))
	.option("--memory-length <number>", "amount of messages to store as context", "20")
	.option("--memory-duration <number>", "amount of time (in seconds) to store the context", "60")
	.option("--system-prompt-file <path>", "path to a text file containing the system prompt template", "system.txt")
	.option("--ollama-host <url>", "(only for --llm ollama) host url of local ollama", "http://localhost:11434")
	.option("--ollama-model <model>", "(only for --llm ollama) ollama model to use")
	// tts options
	.addOption(new Option("--tts <method>", "method for text-to-speech").default("coqui").choices(TTS_METHODS))
	.option("--coqui-model <model>", "(only for --tts coqui) model to use coqui tts, or \"list\" to get a list of them", "tts_models/en/jenny/jenny")
	.addOption(new Option("--coqui-device <name>", "(only for --tts coqui) force-use this device for running coqui").choices(["cuda", "cpu"]))
	// misc/common options
	.option("--python <path>", "path to a python virtual environment (venv) with all dependencies from requirements.txt installed")
	.option("--port <number>", "port number for the websocket server", "3280")
	.addOption(new Option("-d, --force-device <name>", "force-use this device for running models locally").choices(["cuda", "cpu"]));

program.parse();

const options = program.opts();
// Validate options
const config = {
	wake: options.wake as string,
	wakeword: options.wakeword as string,
	asr: options.asr as string,
	silenceThreshold: parseFloat(options.silenceThreshold),
	whisperModel: options.whisperModel as string,
	fasterWhisper: !!options.fasterWhisper,
	whisperDevice: options.whisperDevice as (string | undefined),
	llm: options.llm as string,
	memoryLength: parseInt(options.memoryLength),
	memoryDuration: parseInt(options.memoryDuration),
	systemPromptFile: options.systemPromptFile as string,
	ollamaHost: options.ollamaHost as string,
	ollamaModel: options.ollamaModel as string,
	tts: options.tts as string,
	coquiModel: options.coquiModel as string,
	coquiDevice: options.coquiDevice as (string | undefined),
	python: options.python as string,
	port: parseInt(options.port || process.env.PORT),
	forceDevice: options.forceDevice as (string | undefined)
};
if (isNaN(config.silenceThreshold)) {
	console.error("--silence-threshold should be a float");
	process.exit(1);
} else if (isNaN(config.memoryLength)) {
	console.error("--memory-length should be an integer");
	process.exit(1);
} else if (isNaN(config.memoryDuration)) {
	console.error("--memory-duration should be an integer");
	process.exit(1);
} else if (isNaN(config.port)) {
	console.error("--port should be an integer");
	process.exit(1);
}

// A lock in case of multiple clients
let locked = false;
const server = new WebSocketServer({ port: config.port });

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
				if (!wake) fail("nowake");
				else {
					wake.emit("wake");
					success();
				}
				break;
			// Stop ASR from listening
			case "stop":
				if (!asr) fail("noasr");
				else {
					asr.stop();
					success();
				}
				break;
			// Manual input LLM
			case "manual-llm":
				if (!llm) fail("nollm");
				else {
					llm.process(args.join(" "));
					success();
				}
				break;
			// Clear all message history
			case "clear":
				LLM.clear();
				success();
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
			// Get config
			case "config":
				success();
				socket.send(`config ${JSON.stringify(config)}`);
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
					const old = config.wakeword;
					config.wakeword = args.join(" ");
					if (await changeWake(config.wake)) success();
					else {
						config.wakeword = old;
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
			case "set-asr-silence":
				if (args.length < 1) fail("args");
				else {
					const old = config.silenceThreshold;
					config.silenceThreshold = parseFloat(args.join(" "));
					if (isNaN(config.silenceThreshold)) {
						config.silenceThreshold = old;
						fail("nan");
					}
					else if (await changeASR(config.asr)) success();
					else {
						config.silenceThreshold = old;
						fail("invalid");
					}
				}
				break;
			// set whisper model
			case "set-asr-model":
				if (args.length < 1) fail("args");
				else {
					const old = config.whisperModel;
					config.whisperModel = args.join(" ");
					if (await changeASR(config.asr)) success();
					else {
						config.whisperModel = old;
						fail("invalid");
					}
				}
				break;
			// set whether to use faster whisper or not
			case "set-asr-faster":
				if (args.length < 1) fail("args");
				else {
					const old = config.fasterWhisper;
					if (args[0].toLowerCase() == "true") config.fasterWhisper = true;
					else if (args[0].toLowerCase() == "false") config.fasterWhisper = false;
					else {
						fail("invalid");
						break;
					}
					if (await changeASR(config.asr)) success();
					else {
						config.fasterWhisper = old;
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
					const old = config[key];
					config[key] = parseInt(args.join(" "));
					if (isNaN(config[key])) {
						config[key] = old;
						fail("nan");
					} else if (await changeLLM(config.llm)) success();
					else {
						config[key] = old;
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
					const old = config[key];
					config[key] = args.join(" ");
					if (await changeLLM(config.llm)) success();
					else {
						config[key] = old;
						fail("invalid");
					}
				}
				break;
			case "set-tts":
				if (args.length < 1) fail("args");
				else if (await changeTTS(args.join(" "))) success();
				else fail("invalid");
				break;
			case "set-tts-model":
				if (args.length < 1) fail("args");
				else {
					const old = config.coquiModel;
					config.coquiModel = args.join(" ");
					if (await changeTTS(config.tts)) success();
					else {
						config.coquiModel = old;
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

let llmFinished = true;

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
			sharedWake(null);
		}
		switch (method) {
			case "openwakeword":
				const { OpenWakeWord } = await import("./wake/oww.js");
				wake = new OpenWakeWord(config.wakeword, config.python);
				break;
			case "manual":
				const { ManualWake } = await import("./wake/manual.js");
				wake = new ManualWake(server);
				break;
		}
		if (!wake) throw new Error("Wake or trigger method is invalid!");
		config.wake = method;
		sharedWake(wake);

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
				asr = new LocalASR(config.whisperModel, config.fasterWhisper, config.silenceThreshold, config.whisperDevice || config.forceDevice, config.python);
				break;
			case "google":
				const { GoogleASR } = await import("./asr/google.js");
				asr = new GoogleASR(config.silenceThreshold);
				break;
		}
		if (!asr) throw new Error("ASR method is invalid!");
		config.asr = method;

		asr.on("start", () => {
			server.clients.forEach(socket => socket.send("asr-start"));
		});

		// When the transcription result is ready, pass it to LLM
		asr.on("result", result => {
			server.clients.forEach(socket => socket.send("asr-done " + result));
			llmFinished = false;
			llm?.process(result);
		});

		asr.on("volume", volume => {
			server.clients.forEach(socket => socket.send("asr " + volume));
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
				llm = new OllamaLLM(config.memoryLength, config.memoryDuration, config.systemPromptFile, config.ollamaHost, config.ollamaModel);
				break;
			case "deepseek":
				const { DeepseekLLM } = await import("./llm/deepseek.js");
				llm = new DeepseekLLM(config.memoryLength, config.memoryDuration, config.systemPromptFile);
				break;
		}
		if (!llm) throw new Error("LLM method is invalid!");
		config.llm = method;

		// LLM outputs, pass it to TTS
		llm.on("partial", (word, ctx) => {
			if (ctx == "chat") server.clients.forEach(socket => socket.send(`res ${word}`));
		});
		llm.on("line", line => {
			tts?.process(line);
		});
		llm.on("result", () => {
			llmFinished = true;
			server.clients.forEach(socket => socket.send("res-done"));
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
			sharedTTS(null);
		}

		switch (method) {
			case "coqui":
				const { CoquiTTS } = await import("./tts/coqui.js");
				tts = new CoquiTTS(config.coquiModel, config.coquiDevice || config.forceDevice, config.python);
				break;
			case "google":
				const { GoogleTTS } = await import("./tts/google.js");
				tts = new GoogleTTS();
				break;
		}
		if (!tts) throw new Error("TTS method is invalid!");
		config.tts = method;
		sharedTTS(tts);

		tts.on("start", () => {
			server.clients.forEach(socket => socket.send("tts-start"));
		});

		tts.on("line", line => {
			server.clients.forEach(socket => socket.send("tts-line " + line));
		});

		tts.on("done", remaining => {
			if (remaining == 0 && llmFinished) {
				server.clients.forEach(socket => socket.send("tts-done"));
				wake?.unlock();
			}
		});

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

	await changeWake(config.wake);
	await changeASR(config.asr);
	await changeLLM(config.llm);
	await changeTTS(config.tts);
})();