# Communication
This is an internal documentation of how to use Websocket to communicate between client (web UI) and server (backend program).

## Changelog
Current revision: 0.1
- 0.1: Added `stop` trigger for stopping ASR forcefully.

## Common
All messages are sent as strings.

## Messages from server
- `rec <level>`: Audio loudness when recording. This will be a continuous stream when ASR is running. `<level>` is linear between 0 and 1.
- `res <token>`: LLM streaming responses. Client can simply stream this output by appending the token to the same string.
- `res-done`: An event that will be sent when LLM finished streaming.
- `status <wake> <asr> <llm> <tts>`: Status of components. Each argument is either `true` or `false`.
- `methods <type> <names...>`: Available methods for a component. `<type>` will be one of `wake`, `asr`, `llm`, `tts`.
- `success`: Indicates a command from the client has succeeded.
- `fail <reason>`: Indicates a command from the client has failed.

`success` and `fail` will always be sent for any command.

## Commands to server
### Program Trigger
- `trigger`: Trigger the program to start listening.
- `stop`: Forcefully stop ASR.
### Getters
- `methods <type>`: Get the available methods for a component. `<type>` can be one of `wake`, `asr`, `llm`, `tts`. You will receive a `methods` message from the server.
- `status`: Get the status of components.
### Config
- `set-wake <method>`: Change the wake/trigger method. `<method>` can be `openwakeword` or `manual` (may change, get a list with `methods wake`).
- `set-wake-word <path>`: Change the wake word for `openwakeword`. `<path>` is a path to a .onnx or .tflite file.
- `set-asr <method>`: Change the ASR method. `<method>` can be `whisper` or `google` (may change, get a list with `methods asr`).
- `set-asr-model <model>`: Change the model for Whisper. `<model>` can be `tiny`, `base`, `small`, `medium`, `large`, `turbo` (refer to [openai/whisper](https://github.com/openai/whisper)).
- `set-asr-faster <boolean>`: Change whether or not to use Faster Whisper for Whisper ASR.
- `set-llm <method>`: Change the LLM method. `<method>` can be `deepseek` or `ollama` (may change, get a list with `methods llm`).
- `set-llm-mem-len <number>`: Change the amount of messages to remember.
- `set-llm-mem-dur <number>`: Change the duration (in seconds) to remember the messages.
- `set-llm-sys-prompt <path>`: Change the system prompt file path. The file should include `{commands}` (literal) somewhere so the program can autofill the commands.
- `set-llm-ollama-host <url>`: Change Ollama host. `<url>` should include protocol (`http://` or `https://`).
- `set-llm-ollama-model <name>`: Change model for Ollama. Available models can be listed using `ollama list` in a terminal.
- `set-tts <method>`: Change the TTS method. `<method>` can be `coqui` or `google` (may change, get a list with `methods tts`).
