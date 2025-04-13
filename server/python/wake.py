# Based on https://github.com/dscripka/openWakeWord/blob/main/examples/detect_from_microphone.py

# Only allow direct call of script
import sys
if __name__ != "__main__":
	sys.exit(1)

# Imports
import pyaudio
import numpy as np
import openwakeword
from openwakeword.model import Model

from datetime import datetime, timedelta
import os.path

from common.reader import InputMan

# Check wakeword model
MODEL_PATH = sys.argv[1]
if not os.path.isfile(MODEL_PATH):
	raise Exception("Model path doesn't exist")
MODEL, ext = os.path.splitext(os.path.basename(MODEL_PATH))
if ext != ".onnx" and ext != ".tflite":
	raise Exception("The wake word model must be in .onnx or .tflite")

# Get microphone stream
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
CHUNK = 1280
audio = pyaudio.PyAudio()
mic_stream = audio.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)

# Load pre-trained openwakeword models
openwakeword.utils.download_models(model_names=["melspectrogram.tflite", "melspectrogram.onnx"])
owwModel = Model(wakeword_models=[MODEL_PATH], inference_framework=("tflite" if ext == ".tflite" else "onnx"))
n_models = len(owwModel.models.keys())

# Time when wakeword happened
awake_time = None
locked = False

manager = InputMan()

def handle(message: str):
	if message == "lock":
		locked = True
		print("Locked")
	elif message == "unlock":
		locked = False
		print("Unlocked")

manager.add_listener(handle)

print("Listening for wakewords...")

while True:
	try:
		# Get audio
		audio = np.frombuffer(mic_stream.read(CHUNK), dtype=np.int16)

		now = datetime.utcnow()
		# Feed to openWakeWord model
		prediction = owwModel.predict(audio)

		score = list(owwModel.prediction_buffer[MODEL])[-1]
		if not locked and not awake_time and score > 0.6:
			print(f"{MODEL} activated")
			print(f"wake {MODEL}")
			awake_time = now
		elif awake_time and now - awake_time > timedelta(seconds=3):
			print(f"{MODEL} deactivated")
			awake_time = None
	except KeyboardInterrupt:
		break