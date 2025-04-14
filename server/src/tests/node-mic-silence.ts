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
}).on("data", data => {
	//console.log("data");
});

mic.start();