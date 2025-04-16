import { Command } from "../cmd";

(async () => {
	await Command.init();
	console.log(Command.generateSystemInstruction());
})();
