import "dotenv/config";
import { WebSocketServer } from "ws";
import { ASR } from "./asr";
import { Wake } from "./wake";
import { Option, program } from "commander";

program
	.addOption(new Option("--wake <method>", "method for waking up the voice assistant").default("manual").choices(["manual", "openwakeword"]))
	.option("--wakeword <model>", "model for wake word in tflite or onnx format", "./wakewords/summatia.tflite")
	.addOption(new Option("--asr <method>", "method for automatic speech recognition").default("whisper").choices(["whisper", "picovoice"]))
	.option("--python <path>", "path to a Python virtual environment (venv) with all dependencies from requirements.txt installed")
	.option("--port <number>", "port number for the Websocket server", "3280")
	.option("--picovoice <key>", "access key of Picovoice, used if `asr` is set to `picovoice`")
	.option("--whisper-model <model>", "model size for (faster) whisper", "base")
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
	let wake: Wake;
	if (options.wake == "openwakeword") {
		const { OpenWakeWord } = await import("./wake/oww");
		wake = new OpenWakeWord(options.wakeword, options.python);
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
		const { LocalASR } = await import("./asr/local");
		asr = new LocalASR(options.whisperModel, options.forceDevice, options.python);
	} else {
		const { PicovoiceASR } = await import("./asr/picovoice");
		asr = new PicovoiceASR();
	}
	asr.on("result", result => {
		console.log(result);
		wake.unlock();
	});

	process.on("SIGINT", () => {
		console.log("Interupted. Shutting down...");
		wake.interrupt();
		asr.interrupt();
		console.log("Done!");
		process.exit(0);
	});
})();

/*import("./asr/whisper").then(({ WhisperASR }) => {
	const asr = new WhisperASR("base", false);
	asr.start();
});*/