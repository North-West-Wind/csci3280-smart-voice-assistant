import { PvRecorder } from "@picovoice/pvrecorder-node";
import { ASR } from "../asr";
import { Cheetah } from "@picovoice/cheetah-node";

export class PicovoiceASR extends ASR {
	recorder?: PvRecorder;
	cheetah: Cheetah;
	private running = false;
	private device?: number;

	constructor() {
		super();
		if (!process.env.PICO_KEY) throw new Error("Missing Picovoice API key. Get one from https://console.picovoice.ai/");
		this.cheetah = new Cheetah(process.env.PICO_KEY);
	}

	setDevice(index?: number) {
		this.device = index;
	}

	start() {
		if (this.device !== undefined && (this.device < 0 || this.device >= this.list().length)) throw new Error("Invalid device index");
		if (this.recorder) this.stop();
		this.recorder = new PvRecorder(this.cheetah.frameLength, this.device);
		console.log(`Using device: ${this.recorder.getSelectedDevice()}`);
		this.recorder.start();
		this.running = true;
		// let listen run asynchronously
		this.listen();
	}

	stop() {
		this.recorder?.stop();
		this.recorder?.release();
		this.recorder = undefined;
	}

	private async listen() {
		while (this.recorder?.isRecording && this.running) {
			const frame = this.recorder.readSync();
			try {
				const [partial, isEnd] = this.cheetah.process(frame);
				this.emit("partial", partial);
				if (isEnd) {
					const flushed = this.cheetah.flush();
					this.emit("result", flushed);
					this.running = false;
				}
			} catch (err) {
				console.error(err);
				this.running = false;
			}
		}
		this.stop();
	}

	list() {
		return PvRecorder.getAvailableDevices();
	}

	interrupt() {
		this.stop();
	}
}