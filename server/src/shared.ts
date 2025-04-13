import ffmpeg from "fluent-ffmpeg";
import Speaker from "speaker";

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

export { speaker, transcoder, userAgent };