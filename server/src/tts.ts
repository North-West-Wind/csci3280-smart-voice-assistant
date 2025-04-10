import { EventEmitter } from "stream";

export declare interface TTS {
	on(event: "done", listener: (remaning: number) => void): this;
}

export abstract class TTS extends EventEmitter {
	private id = 0;
	protected lines = new Map<number, string>();

	protected abstract speak(id: number, line: string): Promise<void>;

	process(line: string) {
		const id = this.id++;
		this.lines.set(id, line);
		this.speak(id, line).then(() => {
			this.lines.delete(id);
		});
	}

	interrupt() {
		this.removeAllListeners();
	}
}