"""Serve the packaged React application on a stable, loopback-only origin."""
import argparse
import hashlib
import json
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlsplit

BASE = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent)) / "web-dist"


def build_id():
    return hashlib.sha256((BASE / "index.html").read_bytes()).hexdigest()[:16]


class AppHandler(SimpleHTTPRequestHandler):
    # Windows registry MIME mappings vary by machine; packaged assets need stable types.
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE), **kwargs)

    def do_GET(self):
        if urlsplit(self.path).path == "/__gatsby_health":
            payload = json.dumps({"app": "Gatsby", "build": build_id()}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description="Gatsby local English learning room")
    parser.add_argument("--port", type=int, default=8765, help="Use a fixed origin; changing ports changes browser storage")
    parser.add_argument("--no-browser", action="store_true", help="Serve without opening a browser (testing)")
    args = parser.parse_args()
    if not (BASE / "index.html").is_file():
        print("Frontend build missing. Run npm ci and npm run build first.")
        return 1
    url = f"http://127.0.0.1:{args.port}"
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), AppHandler)
    except OSError:
        try:
            with urlopen(url + "/__gatsby_health", timeout=1) as response:
                existing = json.load(response)
            if existing.get("app") == "Gatsby" and existing.get("build") == build_id():
                if not args.no_browser:
                    webbrowser.open(url)
                print("Gatsby is already running at " + url)
                return 0
        except (OSError, ValueError):
            pass
        print(f"Port {args.port} is occupied. Close the older learning app/server, then start Gatsby again.")
        print("Gatsby will not silently change ports, so your browser keeps the same learning data.")
        return 1
    if not args.no_browser:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    print("Gatsby is running at " + url, flush=True)
    print("Keep this window open while studying; close it to stop Gatsby.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    result = main()
    if result and getattr(sys, "frozen", False) and "--no-browser" not in sys.argv:
        input("Press Enter to close...")
    sys.exit(result)
