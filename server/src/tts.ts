import { EventEmitter } from "stream";

export declare interface TTS {
	on(event: "done", listener: (remaning: number) => void): this;
}

export abstract class TTS extends EventEmitter {
	private id = 0;
	protected lines = new Map<number, string>();

	protected abstract speak(id: number, line: string): Promise<void>;

	process(line: string) {
		// in case line is multi-line, split it and call process again
		const lines = line.split("\n").filter(li => !!li.trim());
		if (lines.length > 1) {
			lines.forEach(li => this.process(li));
			return;
		}
		const id = this.id++;
		this.lines.set(id, line);
		this.speak(id, line).catch(err => {
			console.error(err);
		}).finally(() => {
			this.lines.delete(id);
			this.emit("done", this.lines.size);
		});
	}

	interrupt() {
		this.removeAllListeners();
	}
}