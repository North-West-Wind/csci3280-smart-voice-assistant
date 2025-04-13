import ytsr from "@distube/ytsr";
import { Command } from "../cmd";
import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import { transcoder, speaker } from "../shared";

const transcoders = new Map<number, ffmpeg.FfmpegCommand>();

class PlayCommand extends Command {
	streamCounter = 0;

	constructor() {
		super("play", "Search and play a video or song from YouTube. It's fine if the video played doesn't match the search terms.", [{ name: "keywords", description: "the keywords that will be used for YouTube search." }]);
	}

	async handle(message: string) {
		const result = await ytsr(message, { safeSearch: false, limit: 1, type: "video" });
		const item = result.items[0];

		const id = this.streamCounter++;
		const trans = transcoder(0.25);
		trans
			.input(ytdl(item.url, { filter: "audioonly" }).on("error", console.error))
			.on("error", () => transcoders.delete(id))
			.pipe(speaker());
		transcoders.set(id, trans);

		console.log("/play", item.name);

		return `Success! Now playing "${item.name}"`;
	}
}

class StopCommand extends Command {
	constructor() {
		super("stop", "Stop all the media that is playing.", []);
	}

	handle() {
		if (!transcoders.size) return "Error! No media is playing.";
		for (const transcoder of transcoders.values())
			transcoder.kill("SIGKILL");
		return `Success! Stopped ${transcoders.size} media.`;
	}
}

const play = new PlayCommand();
const stop = new StopCommand();
export { play, stop };