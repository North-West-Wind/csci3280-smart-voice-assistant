# Only allow direct call of script
import sys
if __name__ != "__main__":
	sys.exit(1)

import numpy as np
import speech_recognition as sr
from faster_whisper import WhisperModel
import torch

import time

from common.reader import InputMan

MODEL = sys.argv[1]
DEVICE = ""
if len(sys.argv) >= 3:
	DEVICE = sys.argv[2]
	if DEVICE != "cpu" and DEVICE != "cuda":
		DEVICE = ""
if DEVICE == "":
	DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Init Speech Recognizer (not listening yet)
r = sr.Recognizer()
r.dynamic_energy_threshold = False
r.energy_threshold = 1000
r.pause_threshold = 1.5

model = WhisperModel(MODEL, device=DEVICE, compute_type="float32", compute_type="float32")

manager = InputMan()

def transcribe(message: str):
	if message != "start":
		return
	with sr.Microphone(sample_rate=16000) as source:
		print("Listening to transcribe...")
		audio = r.listen(source)
		print("Stopped listening")
		audio_np = np.frombuffer(audio.get_raw_data(), dtype=np.int16).astype(np.float32) / 32768.0
		segments, info = model.transcribe(audio_np)
		text = ""
		for segment in segments:
			text += segment.text
		print("result " + text)

manager.add_listener(transcribe)

# A loop to keep the program running
while True:
	try:
		time.sleep(1)
	except KeyboardInterrupt:
		break