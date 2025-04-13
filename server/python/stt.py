# Only allow direct call of script
import sys
if __name__ != "__main__":
	sys.exit(1)

import numpy as np
import speech_recognition as sr
import torch

import time

from common.reader import InputMan

if len(sys.argv) < 3:
	print("Invalid usage of stt.py")
	print(f"Usage: {sys.argv[0]} <faster|whisper> <model> [device]")
	sys.exit(1)

FASTER = sys.argv[1] == "faster"
MODEL = sys.argv[2]
DEVICE = ""
if len(sys.argv) >= 4:
	DEVICE = sys.argv[3]
	if DEVICE != "cpu" and DEVICE != "cuda":
		DEVICE = ""
if DEVICE == "":
	DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Init Speech Recognizer (not listening yet)
r = sr.Recognizer()
r.dynamic_energy_threshold = False
r.energy_threshold = 1000
r.pause_threshold = 1.5

# Initialize (faster) whisper model
model = None
if FASTER:
	from faster_whisper import WhisperModel
	model = WhisperModel(MODEL, device=DEVICE, compute_type="float32")
else:
	import whisper
	model = whisper.load_model(MODEL).to(DEVICE)

manager = InputMan()

def transcribe(message: str):
	if message != "start":
		return
	with sr.Microphone(sample_rate=16000) as source:
		print("Listening to transcribe...")
		audio = r.listen(source)
		print("Stopped listening")
		# Get numpy audio data
		audio_np = np.frombuffer(audio.get_raw_data(), dtype=np.int16).astype(np.float32) / 32768.0
		# Transcribe depending on whether we are using faster whisper or not
		text = ""
		if FASTER:
			segments, info = model.transcribe(audio_np)
			for segment in segments:
				text += segment.text
		else:
			result = model.transcribe(torch.from_numpy(audio_np), fp16=False)
			text = result["text"]
		# Send transcription
		print("result " + text)

manager.add_listener(transcribe)
print(f"{'Faster ' if FASTER else ''}Whisper is ready")

# Join thread to keep program running until InputMan dies
manager.join()