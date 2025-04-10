import { SpeechClient } from "@google-cloud/speech";
import NodeMic from "node-mic";
import { ASR } from "../asr";
import { google } from "@google-cloud/speech/build/protos/protos";

export class GoogleASR extends ASR {
	private client: SpeechClient;
	private mic?: NodeMic;

	constructor() {
		super();

		if (!process.env.GOOGLE_KEY) throw new Error("No Google Cloud API key found! Create a file named \".env\" under the \"server/\" directory and append \"GOOGLE_KEY=<key>\" to the file. The API key should be able to call the Cloud Speech API.");
		this.client = new SpeechClient({ apiKey: process.env.GOOGLE_KEY });
	}

	start() {
		this.mic = new NodeMic({
			rate: 16000,
			channels: 1,
			bitwidth: 16,
			endian: "little",
			fileType: "raw"
		});

		const request = {
			config: {
				encoding: google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16,
				sampleRateHertz: 16000
			},
			interimResults: true
		};

		const recognizer = this.client
			.streamingRecognize(request)
			.on("data", data => {
				if (data.results[0].isFinal) this.emit("result", data.results[0].alternatives[0].transcript);
				else this.emit("unsure", data.results[0].alternatives[0].transcript);
			});

		this.mic.getAudioStream().pipe(recognizer);
		this.mic.start();
	}

	stop() {
		this.mic?.stop();
	}

	interrupt() {
		this.stop();
	}
}