import { PythonShell } from "python-shell";
import { EventEmitter } from "stream";

export declare interface Wake {
	on(event: "wake", listener: (wakeword: string) => void): this;
}

export abstract class Wake extends EventEmitter {
	abstract lock(): void;
	abstract unlock(): void;
}