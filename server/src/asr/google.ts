import { SpeechClient } from "@google-cloud/speech";
import { ASR } from "../asr";
import { google } from "@google-cloud/speech/build/protos/protos";

export class GoogleASR extends ASR {
	private client: SpeechClient;
	private threshold: number;
	private mic?: any;
	private transcripts: string[] = [];
	private running = false;

	constructor(threshold: number) {
		super();

		if (!process.env.GOOGLE_KEY) throw new Error("No Google Cloud API key found! Create a file named \".env\" under the \"server/\" directory and append \"GOOGLE_KEY=<key>\" to the file. The API key should be able to call the Cloud Speech API.");
		this.client = new SpeechClient({ apiKey: process.env.GOOGLE_KEY });
		this.threshold = Math.round(threshold * 8);
	}

	async start() {
		if (this.running) return;
		this.running = true;
		const NodeMic = (await import("node-mic")).default;
		this.mic = new NodeMic({
			rate: 16000,
			channels: 1,
			bitwidth: 16,
			endian: "little",
			fileType: "raw",
			threshold: this.threshold,
		});

		const request = {
			config: {
				encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
				sampleRateHertz: 16000,
				languageCode: "en-US"
			},
			interimResults: true
		};

		this.transcripts = [];

		const recognizer = this.client
			.streamingRecognize(request)
			.on("error", err => {
				console.error(err);
			})
			.on("data", data => {
				if (data.results[0].isFinal) {
					this.emit("partial", data.results[0].alternatives[0].transcript);
					this.transcripts.push(data.results[0].alternatives[0].transcript);
					if (!this.threshold) this.stop();
				} else this.emit("unsure", data.results[0].alternatives[0].transcript);
			});

		this.mic.getAudioStream().on("data", (chunk: number[]) => {
			const sum = chunk.map(sample => Math.abs(sample)).reduce((a, b) => a + b);
			this.emit("volume", sum / (chunk.length * 255));
		}).on("silence", () => {
			this.stop();
		}).on("error", (err: any) => {
			console.error(err);
		}).pipe(recognizer);
		this.mic.start();
		this.emit("start");
	}

	stop() {
		this.mic?.stop();
		this.emit("result", this.transcripts.join(". "));
		this.running = false;
	}

	interrupt() {
		super.interrupt();
		this.stop();
	}
}