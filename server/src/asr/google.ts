import { SpeechClient } from "@google-cloud/speech";
import NodeMic from "node-mic";
import { ASR } from "../asr";
import { google } from "@google-cloud/speech/build/protos/protos";

export class GoogleASR extends ASR {
	private client: SpeechClient;
	private mic?: NodeMic;

	constructor() {
		super();

		this.client = new SpeechClient();
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