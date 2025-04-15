import { TTS } from "../tts";
import { transcoder, speaker, wait } from "../shared";
import axios from "axios";

export class SAPI4TTS extends TTS {
	private url: string;
	private queue: number[] = [];

	constructor(voice: string, pitch: number, speed: number) {
		super();
		this.url = `https://www.tetyys.com/SAPI4/SAPI4?voice=${voice}&pitch=${pitch}&speed=${speed}&text=`;
	}

	protected async speak(id: number, line: string) {
		const resp = await axios({
			url: this.url + encodeURIComponent(line),
			timeout: 20000,
			responseType: "stream"
		});
		while (this.queue[0] != id) {
			await wait(100);
		}
		this.emit("line", line);
		const trans = transcoder();
		await new Promise<void>(res => {
			trans.input(resp.data)
				.on("end", () => res())
				.pipe(speaker());
		});
		this.queue.shift();
	}
}