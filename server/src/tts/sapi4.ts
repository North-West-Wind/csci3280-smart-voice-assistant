import fetch from "node-fetch";
import { TTS } from "../tts";
import { Readable } from "stream";
import { createTranscoder, speaker, userAgent } from "../shared";

export class SAPI4TTS extends TTS {
	private url: string;

	constructor(voice: string, pitch: number, speed: number) {
		super();
		this.url = `https://www.tetyys.com/SAPI4/SAPI4?voice=${voice}&pitch=${pitch}&speed=${speed}&text=`;
	}

	protected async speak(_id: number, line: string) {
		const resp = await fetch(this.url + encodeURIComponent(line), { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(20000) });
		const transcoder = createTranscoder();
		await new Promise<void>(res => {
			transcoder.input(resp.body as Readable)
				.on("end", () => {
					res();
				})
				.pipe(speaker);
		});
	}
}