import { GoogleASR } from "../src/asr/google";

const asr = new GoogleASR();

asr.on("unsure", transcript => {
	console.log(transcript);
});

asr.on("result", transcript => {
	console.log("Final:", transcript);
});

asr.start();

process.on("SIGINT", () => {
	asr.interrupt();
});