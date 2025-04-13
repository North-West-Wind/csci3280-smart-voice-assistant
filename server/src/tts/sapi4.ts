import { TTS } from "../tts";
import { createTranscoder, speaker } from "../shared";
import axios from "axios";

export class SAPI4TTS extends TTS {
	private url: string;

	constructor(voice: string, pitch: number, speed: number) {
		super();
		this.url = `https://www.tetyys.com/SAPI4/SAPI4?voice=${voice}&pitch=${pitch}&speed=${speed}&text=`;
	}

	protected async speak(_id: number, line: string) {
		const resp = await axios({
			url: this.url + encodeURIComponent(line),
			timeout: 20000,
			responseType: "stream"
		});
		const transcoder = createTranscoder();
		await new Promise<void>(res => {
			transcoder.input(resp.data)
				.on("end", () => {
					res();
				})
				.pipe(speaker);
		});
	}
}