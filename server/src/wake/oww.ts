import { PythonShell } from "python-shell";
import { Wake } from "../wake";

export class OpenWakeWord extends Wake {
	private ready: boolean;
	private shell?: PythonShell;

	constructor(pythonPath?: string) {
		super();
		this.ready = false;
		PythonShell.runString("", { pythonPath, pythonOptions: ["--version"] }).then(output => {
			if (!output[0] || typeof output[0] != "string") throw new Error("Invalid Python version. It must be Python 3 but <= 3.10");
			const version = output[0].split(" ")[1].split(".").map(s => parseInt(s));
			if (version[0] != 3 || version[1] > 10) throw new Error("Invalid Python version. It must be Python 3 but <= 3.10"); 

			const shell = new PythonShell("./python/wake.py", { pythonPath, mode: "text", pythonOptions: ["-u"] });
			shell.on("message", (message: string) => {
				const arr = message.split(" ");
				const type = arr.shift();
				switch (type) {
					case "wake":
						this.emit("wake", arr.join(" "));
						break;
					default:
						console.log(message);
				}
				console.log("stt: " + message);
			}).on("pythonError", err => {
				this.ready = false;
				throw err;
			}).on("stderr", err => {
				console.error("stt: " + err);
			});

			this.ready = true;
		});
	}

	lock() {
		if (!this.ready) throw new Error("OpenWakeWord is not ready yet");
		this.shell?.send("lock");
	}

	unlock() {
		this.shell?.send("unlock");
	}
}