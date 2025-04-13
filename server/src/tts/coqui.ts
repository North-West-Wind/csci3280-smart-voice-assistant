import { PythonShell } from "python-shell";
import { TTS } from "../tts";

export declare interface CoquiTTS {
	on(event: "done", listener: (remaning: number) => void): this;
	on(event: "finish", listener: (id: number) => void): this;
}

export class CoquiTTS extends TTS {
	private ready: boolean;
	private shell?: PythonShell;

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
					case "finish":
						this.emit("finish", parseInt(arr.join("")));
						break;
					default:
						console.log("tts: " + message);
				}
			}).on("pythonError", err => {
				this.ready = false;
				throw err;
			}).on("stderr", err => {
				console.error("tts: " + err);
			});

			this.ready = true;
		});
	}

	protected async speak(id: number, line: string) {
		if (!this.ready) throw new Error("CoquiTTS is not ready yet");
		const prom = new Promise<void>(res => {
			this.on("finish", uid => {
				if (uid == id)
					res();
			});
		});
		this.shell?.send(`${id} ${line}`);
		await prom;
	}

	interrupt() {
		super.interrupt();
		this.shell?.kill("SIGINT");
	}
}