import "dotenv/config";
import { WebSocket, WebSocketServer } from "ws";
import { ASR } from "./asr";
import { Wake } from "./wake";
import { Option, program } from "commander";

program
	.addOption(new Option("--wake <method>", "method for waking up the voice assistant").default("manual").choices(["manual", "openwakeword"]))
	.addOption(new Option("--asr <method>", "method for automatic speech recognition").default("whisper").choices(["whisper", "picovoice"]))
	.option("--python <path>", "path to a Python virtual environment (venv) with all dependencies from requirements.txt installed")
	.option("--port <number>", "port number for the Websocket server", "3280")
	.option("--picovoice <key>", "access key of Picovoice, used if `asr` is set to `picovoice`");

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
	let wake: Wake;
	if (options.wake == "openwakeword") {
		const { OpenWakeWord } = await import("./wake/oww");
		wake = new OpenWakeWord(options.python);
	} else {
		const { ManualWake } = await import("./wake/manual");
		wake = new ManualWake(server);
	}
	wake.on("wake", () => {
		wake.lock();
		asr.start();
	});
	
	let asr: ASR;
	if (options.asr == "whisper") {
		const { WhisperASR } = await import("./asr/whisper");
		asr = new WhisperASR("./python/.venv/bin/python");
	} else {
		const { PicovoiceASR } = await import("./asr/picovoice");
		asr = new PicovoiceASR();
	}
	asr.on("result", result => {
		console.log(result);
		wake.unlock();
	});
})();

/*import("./asr/whisper").then(({ WhisperASR }) => {
	const asr = new WhisperASR("base", false);
	asr.start();
});*/