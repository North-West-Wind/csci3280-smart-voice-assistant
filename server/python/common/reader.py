from collections.abc import Callable
import sys
from threading import Thread

class InputMan:
	def __init__(self):
		self._running = True
		self._listeners = list()
		self._thread = Thread(target=self.listen, daemon=True)
		self._thread.daemon = True
		self._thread.start()

	def listen(self):
		while self._running:
			try:
				for line in sys.stdin:
					match line:
						case "exit":
							self._running = False
						case _:
							for listener in self._listeners:
								Thread(target=listener, args=(line.rstrip("\n"),), daemon=True).start()
			except KeyboardInterrupt:
				self._running = False
			except:
				pass

	def add_listener(self, listener: Callable[[str], None]):
		self._listeners.append(listener)