import ffmpeg from "fluent-ffmpeg";
import Speaker from "speaker";
import { TTS } from "./tts";
import { Wake } from "./wake";

const speaker = () => new Speaker({
	channels: 2,
	bitDepth: 16,
	sampleRate: 48000
});

function transcoder(volume = 1) {
	return ffmpeg()
		.format("s16le")
		.audioFrequency(48000)
		.audioChannels(2)
		.audioFilter("volume=" + volume);
}

const userAgent = "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0";
const endPunctuations = [". ", "! ", "? "];

let wakeStore: Wake | null = null;
function sharedWake(wake?: Wake | null) {
	if (wake !== undefined) wakeStore = wake;
	return wakeStore;
}

let ttsStore: TTS | null = null;
function sharedTTS(tts?: TTS | null) {
	if (tts !== undefined) ttsStore = tts;
	return ttsStore;
}

async function wait(ms: number) {
	return new Promise<void>(res => setTimeout(res, ms));
}

export { speaker, transcoder, userAgent, endPunctuations, sharedWake, sharedTTS, wait };