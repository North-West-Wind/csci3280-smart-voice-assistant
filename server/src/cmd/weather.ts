import Parser from "rss-parser";
import { Command } from "../cmd";

const HKO_URL = "https://rss.weather.gov.hk/rss/CurrentWeather.xml";

class WeatherCommand extends Command {
	private parser: Parser;

	constructor() {
		super("weather", "Get the current weather in Hong Kong.", {});
		this.parser = new Parser();
	}

	async handle() {
		const feed = await this.parser.parseURL(HKO_URL);
		let content = feed.items[0].content?.trim();
		if (!content) return "Error! The Hong Kong Observatory didn't return necessary information.";
		content = content.split("\t").slice(0, -1).join(" ");
		content = content.replace(/<br\/>/g, "").replace(/ :/g, ":");
		content = content.replace(/<SPAN.*?>/, "\n");
		content = content.split("\n").map(line => line.trim()).join("\n");
		content = content.split("\n").slice(0, 3).join(" ") + "\n" + content.split("\n").slice(3).join("\n");
		content = content.replace(/<\/?\w+.*>/gm, "");
		content = content.replace("a.m.", "AM").replace("p.m.", "PM");
		return content;
	}
}

const weather = new WeatherCommand();
export { weather };