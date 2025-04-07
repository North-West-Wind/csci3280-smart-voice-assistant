import { PythonShell } from "python-shell";
import { ASR } from "../asr";

export class LocalASR extends ASR {
	private ready: boolean;
	private running: boolean;
	private shell?: PythonShell;

	constructor(model: string, device?: string, pythonPath?: string) {
		super();
		this.ready = false;
		this.running = false;
		PythonShell.runString("", { pythonPath, pythonOptions: ["--version"] }).then(output => {
			if (!output[0] || typeof output[0] != "string") throw new Error("Invalid Python version. It must be Python 3 but <= 3.10");
			const version = output[0].split(" ")[1].split(".").map(s => parseInt(s));
			if (version[0] != 3 || version[1] > 10) throw new Error("Invalid Python version. It must be Python 3 but <= 3.10"); 

			this.shell = new PythonShell("./python/stt.py", { pythonPath, mode: "text", pythonOptions: ["-u"], args: [model].concat(device ? [device] : []) });
			this.shell.on("message", (message: string) => {
				const arr = message.split(" ");
				const type = arr.shift();
				switch (type) {
					case "result":
						if (this.running)	this.emit("result", arr.join(" "));
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

	start() {
		if (!this.ready) throw new Error("LocalASR is not ready yet");
		this.running = true;
		this.shell?.send("start");
	}

	stop() {
		this.running = false;
	}

	interrupt() {
		this.stop();
		this.shell?.kill("SIGINT");
	}
}