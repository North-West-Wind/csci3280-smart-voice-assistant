import wikipedia from "wikipedia";
import { Command } from "../cmd";

class WikiCommand extends Command {
	constructor() {
		super("wiki", "Retrieve the summary of an article on Wikipedia", { query: "the query to search for. At most 5 words." });
	}

	async handle(message: string) {
		const res = await wikipedia.search(message);
		if (!res.results.length) return `Error! No result from searching. Try making the query simpler.`;
		const title = res.results[0].title;
		return (await wikipedia.summary(title)).extract;
	}
}

const wiki = new WikiCommand();

export { wiki };