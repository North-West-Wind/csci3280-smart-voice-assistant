import { PythonShell } from "python-shell";
import { ASR } from "../asr";

export class LocalASR extends ASR {
	private ready: boolean;
	private shell?: PythonShell;
	private mic?: any;

	constructor(model: string, faster: boolean, threshold: number, device?: string, pythonPath?: string) {
		super();
		this.ready = false;
		PythonShell.runString("", { pythonPath, pythonOptions: ["--version"] }).then(output => {
			if (!output[0] || typeof output[0] != "string") throw new Error("Invalid Python version. It must be Python 3 but <= 3.11");
			const version = output[0].split(" ")[1].split(".").map(s => parseInt(s));
			if (version[0] != 3 || version[1] > 11) throw new Error("Invalid Python version. It must be Python 3 but <= 3.11"); 

			this.shell = new PythonShell("./python/stt.py", { pythonPath, mode: "text", pythonOptions: ["-u"], args: [faster ? "faster" : "n", model, threshold.toString()].concat(device ? [device] : []) });
			this.shell.on("message", (message: string) => {
				const arr = message.split(" ");
				const type = arr.shift();
				switch (type) {
					case "result":
						this.emit("result", arr.join(" "));
						this.stop();
						break;
					default:
						console.log("stt: " + message);
				}
			}).on("pythonError", err => {
				this.ready = false;
				throw err;
			}).on("stderr", err => {
				console.error("stt: " + err);
			});

			this.ready = true;
		});
	}

	async start() {
		if (!this.ready) throw new Error("LocalASR is not ready yet");
		this.shell?.send("start");
		this.emit("start");

		// NodeMic here is purely for output volume
		const NodeMic = (await import("node-mic")).default;
		this.mic = new NodeMic({
			rate: 16000,
			channels: 1,
			bitwidth: 16,
			endian: "little",
			fileType: "raw"
		});

		this.mic.getAudioStream().on("data", (chunk: number[]) => {
			const sum = chunk.map(sample => Math.abs(sample)).reduce((a, b) => a + b);
			this.emit("volume", sum / (chunk.length * 255));
		});
		this.mic.start();
	}

	stop() {
		this.mic?.stop();
	}

	interrupt() {
		super.interrupt();
		this.stop();
		this.shell?.send("stop");
		this.shell?.kill("SIGINT");
	}
}