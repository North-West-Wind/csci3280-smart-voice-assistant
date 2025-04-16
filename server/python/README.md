# Python Stuff
Some libraries are only available in Python, notably Open Wake Word and Faster Whisper.

## Open Wake Word
Open Wake Word is a library for wake words. It can also handle custom wake words.

`wake.py` is a Python script that uses OWW to trigger the Node.js server via websocket.

## Faster Whisper
Faster Whisper is a library that provides faster transcriptions using OpenAI Whisper models.

`stt.py` is a Python script that runs Faster Whisper with data from a websocket.