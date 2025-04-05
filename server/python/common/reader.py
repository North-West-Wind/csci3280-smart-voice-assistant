from collections.abc import Callable
import fileinput
from threading import Thread

class InputMan:
	def __init__(self):
		self._running = True
		self._listeners = list()
		Thread(target=self.listen).start()

	def listen(self):
		while self._running:
			for line in fileinput.input():
				match line:
					case "exit":
						self._running = False
					case _:
						for listener in self._listeners:
							Thread(target=listener, args=(line,)).start()

	def add_listener(self, listener: Callable[[str], None]):
		self._listeners.append(listener)