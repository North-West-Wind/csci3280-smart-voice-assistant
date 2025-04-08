import { OrganicResult, search } from "google-sr";
import { convert } from "html-to-text";
import { Command } from "../cmd";

class LookupCommand extends Command {
	constructor() {
		super("lookup", "Use a search engine to lookup information.", [{ name: "query", description: "the query (10 words maximum) to be used for searching." }]);
	}

	async handle(message: string) {
		const results = await search({
			query: message,
			resultTypes: [OrganicResult],
			requestConfig: {
				params: {
					gl: "us"
				}
			}
		});
		let converted = "";
		for (const entry of results) {
			if (entry.link) {
				const { extract } = await import("@extractus/article-extractor");
				const data = await extract(entry.link, {}, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0" } });
				if (data?.content) {
					converted = convert(data.content, {
						wordwrap: false,
						selectors: [ { selector: 'a', options: { ignoreHref: true } } ]
					});
					converted = converted.split("\n\n").slice(0, 5).join("\n\n");
					break;
				}
			}
		}

		return converted;
	}
}

export default new LookupCommand();