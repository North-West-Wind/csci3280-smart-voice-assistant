import { EventEmitter } from "stream";

export declare interface TTS {
	on(event: "start", listener: () => void): this;
	on(event: "line", listener: (line: string) => void): this;
	on(event: "done", listener: (remaning: number) => void): this;
}

export abstract class TTS extends EventEmitter {
	private id = 0;
	private speaking = false;
	protected lines = new Map<number, string>();
	protected queue: number[] = [];

	protected abstract speak(id: number, line: string): Promise<void>;

	process(line: string) {
		// in case line is multi-line, split it and call process again
		const lines = line.split("\n").filter(li => !!li.trim());
		if (lines.length > 1) {
			lines.forEach(li => this.process(li));
			return;
		}
		if (!this.speaking) {
			this.speaking = true;
			this.emit("start");
		}
		const id = this.id++;
		this.lines.set(id, line);
		this.queue.push(id);
		this.speak(id, line).catch(err => {
			console.error(err);
		}).finally(() => {
			this.lines.delete(id);
			this.queue.shift();
			this.emit("done", this.lines.size);
			if (!this.lines.size) this.speaking = false;
		});
	}

	interrupt() {
		this.removeAllListeners();
	}
}