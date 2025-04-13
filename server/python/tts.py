# Only allow direct call of script
import sys
if __name__ != "__main__":
	sys.exit(1)

import sounddevice as sd
import torch
from TTS.api import TTS

from queue import Queue
import time

from common.reader import InputMan

if len(sys.argv) < 2:
	print("Invalid usage of tts.py")
	print(f"Usage: {sys.argv[0]} <model> [device]")
	sys.exit(1)

MODEL = sys.argv[1]
if MODEL == "list":
	print(TTS.list_models())
	sys.exit(0)

DEVICE = ""
if len(sys.argv) >= 3:
	DEVICE = sys.argv[2]
	if DEVICE != "cpu" and DEVICE != "cuda":
		DEVICE = ""
if DEVICE == "":
	DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

tts = TTS(MODEL).to(DEVICE)

manager = InputMan()
wavs = Queue()

def play(message: str):
	uid, text = message.split(" ", 1)
	wav = tts.tts(text=text)
	wavs.put((uid, wav))

manager.add_listener(play)

# A loop to dequeue TTS wavs
while True:
	try:
		time.sleep(1)
		if not wavs.empty():
			uid, wav = wavs.get()
			sd.play(wav, 48000) # Sample rate may depend on the model
			sd.wait()
			print(f"finish {uid}")
	except KeyboardInterrupt:
		sd.stop()
		break