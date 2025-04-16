import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { TTS } from "../tts";
import { google } from "@google-cloud/text-to-speech/build/protos/protos";
import { speaker, transcoder, wait } from "../shared";
import { Readable } from "stream";

export class GoogleTTS extends TTS {
	private client: TextToSpeechClient;

	constructor() {
		super();

		if (!process.env.GOOGLE_KEY) throw new Error("No Google Cloud API key found! Create a file named \".env\" under the \"server/\" directory and append \"GOOGLE_KEY=<key>\" to the file. The API key should be able to call the Cloud Speech API.");
		this.client = new TextToSpeechClient({ apiKey: process.env.GOOGLE_KEY });
	}

	protected async speak(id: number, line: string) {
		const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
			input: { text: line },
			voice: {
				languageCode: "en-US",
				ssmlGender: "FEMALE"
			},
			audioConfig: {
				audioEncoding: "PCM"
			}
		};

		const [response] = await this.client.synthesizeSpeech(request);
		while (this.queue[0] != id) {
			await wait(100);
		}
		this.emit("line", line);
		if (response.audioContent && typeof response.audioContent != "string") {
			const stream = Readable.from(response.audioContent);
			const trans = transcoder();
			await new Promise<void>(res => {
				trans.input(stream)
					.pipe(speaker())
					.on("close", () => {
						res();
					});
			});
		}
	}
}