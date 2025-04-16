# Only allow direct call of script
import sys
if __name__ != "__main__":
	sys.exit(1)

import sounddevice as sd
import torch
from TTS.api import TTS

from queue import Queue
import threading
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
lock = threading.Lock()
running = True
inputs = Queue()
wavs = Queue()

def play(message: str):
	with lock:
		uid, text = message.split(" ", 1)
		inputs.put((uid, text))

manager.add_listener(play)

# Threaded wav processing
def process_inputs():
	while True:
		time.sleep(0.1)
		if not inputs.empty():
			uid, text = inputs.get()
			if not text.strip():
				print(f"ignore {uid}")
				continue
			wav = tts.tts(text=text)
			wavs.put((uid, wav))

thread = threading.Thread(target=process_inputs)
thread.daemon = True
thread.start()

print("ready")

# A loop to dequeue TTS wavs
while True:
	try:
		time.sleep(0.1)
		if not wavs.empty():
			uid, wav = wavs.get()
			print(f"start {uid}")
			sd.play(wav, 48000) # Sample rate may depend on the model
			sd.wait()
			print(f"finish {uid}")
	except KeyboardInterrupt:
		sd.stop()
		break