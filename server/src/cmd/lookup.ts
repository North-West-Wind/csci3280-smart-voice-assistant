import { OrganicResult, search } from "google-sr";
import { convert } from "html-to-text";
import { Command } from "../cmd";
import { userAgent } from "../shared";

class LookupCommand extends Command {
	constructor() {
		super("lookup", "Use a search engine to lookup information.", { query: "the query (10 words maximum) to be used for searching." });
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
				const data = await extract(entry.link, {}, { headers: { "User-Agent": userAgent } });
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