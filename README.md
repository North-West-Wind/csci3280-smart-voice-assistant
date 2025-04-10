# Smart Voice Assistant
The smart voice assistant project for CSCI3280. This is an application that runs locally on a computer, with information displayed to a web UI using websocket.

## Server Setup
### Prerequisite
You need the following installed:
- Node.js 20
- Python 3.11

### Install
After that, change the current directory to `server` and install the required packages:
```sh
cd server
npm i # Install node.js packages
npm run setup-python # Create a python virtual environment and install python packages
npm run build # Build node.js files so we can run them later
```

### Usage
You can start the server with this:
```sh
npm start
```

By default, the program runs local `whisper` for ASR, remote `deepseek` for LLM and local `coqui` for TTS. Because I'm poor and don't want my wallet to potentially explode, please provide your own API key for Deepseek. To add an API key to the program, do the following:

1. Create a file named `.env` under the `server/` directory.
2. Put the following inside the `.env` file:
```.env
DEEPSEEK_KEY=<your deepseek api key here>
```

Additionally, you also have the choice to run this program with remote APIs for other components as well, namely `google` for ASR and TTS. Note that the Google API key should have the permissions to call Cloud Speech and Cloud Text-to-speech.

```.env
GOOGLE_KEY=<your google credential key here>
```

### Options
As mentioned in usage, this program supports a lot of options. You can see all the available options by running the program with `--help`:
```sh
npm start -- --help
```

To add more options while running the program, remember to put them after the first `--`. For example, to use local `ollama` for LLM, run this:
```sh
npm start -- --llm ollama
```