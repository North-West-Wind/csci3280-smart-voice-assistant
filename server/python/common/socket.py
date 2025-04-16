from collections.abc import Callable
from threading import Thread
from websockets.sync.client import connect

class SocketMan:
	_name: str
	_port: int
	_listening: bool
	_listeners: list[Callable[[str], None]]

	def __init__(self, name: str, port: int):
		self._name = name
		self._port = port
		self._listening = True
		self._listeners = list()
		Thread(target=self.listen).start()

	def listen(self):
		# Connect to websocket server
		print(f"Connecting to ws://localhost:{self._port}")
		with connect(f"ws://localhost:{self._port}") as websocket:
			# Initial ping
			websocket.send(self._name)
			res = websocket.recv(10)
			if res != "ok":
				raise "Websocket server responded with not OK"
			websocket.send("yippee!")
			self._websocket = websocket
			# Continuous listening to websocket server
			while self._listening:
				res = websocket.recv(60)
				match res:
					case "ping":
						print("pong")
						pass
					case "exit":
						self._listening = False
					case _:
						# Call all event listener
						for listener in self._listeners:
							Thread(target=listener, args=[res]).start()

	def add_listener(self, listener: Callable[[str], None]):
		self._listeners.append(listener)

	def send(self, message: str):
		if not self._websocket:
			raise "Websocket client doesn't exist yet"
		self._websocket.send(message)
