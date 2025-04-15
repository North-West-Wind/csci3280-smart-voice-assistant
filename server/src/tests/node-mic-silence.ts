import NodeMic from "node-mic";

const mic = new NodeMic({
	rate: 16000,
	channels: 1,
	bitwidth: 16,
	endian: "little",
	fileType: "raw",
	threshold: 16,
	debug: true
});

mic.getAudioStream().on("silence", () => {
	console.log("silence");
}).on("sound", () => {
	console.log("sound");
}).on("data", (chunk: number[]) => {
	const sum = chunk.map(sample => Math.abs(sample)).reduce((a, b) => a + b);
	console.log(sum / chunk.length);
	//console.log("data");
});

mic.start();