import { PythonShell } from "python-shell";
import { TTS } from "../tts";
import { wait } from "../shared";

export class CoquiTTS extends TTS {
	private ready: boolean;
	private shell?: PythonShell;
	private processing = new Set<number>();

	constructor(model: string, device?: string, pythonPath?: string) {
		super();
		this.ready = false;
		PythonShell.runString("", { pythonPath, pythonOptions: ["--version"] }).then(output => {
			if (!output[0] || typeof output[0] != "string") throw new Error("Invalid Python version. It must be Python 3 but <= 3.11");
			const version = output[0].split(" ")[1].split(".").map(s => parseInt(s));
			if (version[0] != 3 || version[1] > 11) throw new Error("Invalid Python version. It must be Python 3 but <= 3.11"); 

			this.shell = new PythonShell("./python/tts.py", { pythonPath, mode: "text", pythonOptions: ["-u"], args: [model].concat(device ? [device] : []) });
			this.shell.on("message", (message: string) => {
				const arr = message.split(" ");
				const type = arr.shift();
				switch (type) {
					case "start":
						this.processing.add(parseInt(arr.join("")));
						break;
					case "finish":
						this.processing.delete(parseInt(arr.join("")));
						break;
					case "ignore":
						let id = parseInt(arr.join(""));
						this.processing.add(id);
						setTimeout(() => {
							this.processing.delete(id);
						}, 100);
						break;
					case "ready":
						console.log("CoquiTTS is ready");
						this.ready = true;
						break;
					default:
						// console.log("tts: " + message);
				}
			}).on("pythonError", err => {
				this.ready = false;
				throw err;
			}).on("stderr", err => {
				console.error("tts: " + err);
			});
		});
	}

	protected async speak(id: number, line: string) {
		if (!this.ready) throw new Error("CoquiTTS is not ready yet");
		this.shell?.send(`${id} ${line}`);
		while (!this.processing.has(id))
			await wait(100);
		this.emit("line", line);
		while (this.processing.has(id))
			await wait(100);
	}

	interrupt() {
		super.interrupt();
		this.shell?.kill("SIGINT");
	}
}