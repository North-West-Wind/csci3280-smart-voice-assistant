import { PythonShell } from "python-shell";
import { ASR } from "../asr";

export class LocalASR extends ASR {
	private ready: boolean;
	private shell?: PythonShell;

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
						this.emit("stop");
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
		this.shell?.send("start");
		this.emit("start");
	}

	stop() {
		this.shell?.send("stop");
	}

	interrupt() {
		super.interrupt();
		this.stop();
		this.shell?.kill("SIGINT");
	}
}