import { LLM, TypedMessage } from "../llm";

export class DeepseekLLM extends LLM {
	protected async chat(messages: TypedMessage[]) {
		return "";
	}
}