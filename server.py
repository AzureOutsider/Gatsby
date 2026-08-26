import socket
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys

BASE = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))

class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE), **kwargs)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def log_message(self, fmt, *args):
        pass

def free_port(start=8765):
    for port in range(start, start + 100):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                pass
    raise RuntimeError("No free local port found")

def main():
    port = free_port()
    server = ThreadingHTTPServer(("127.0.0.1", port), AppHandler)
    url = "http://127.0.0.1:" + str(port)
    threading.Timer(0.7, lambda: webbrowser.open(url)).start()
    print("English Study is running at " + url)
    print("Close this window to stop the local server.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
