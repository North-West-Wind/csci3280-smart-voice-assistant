import wiki from "wikipedia";

(async () => {
	const res = await wiki.summary("Quantum Computing");
	console.log(res);
})();