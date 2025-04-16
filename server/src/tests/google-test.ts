import { GoogleASR } from "../asr/google";

const asr = new GoogleASR(1);

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