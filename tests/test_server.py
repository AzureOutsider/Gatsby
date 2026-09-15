import importlib.util
import json
import socket
import threading
import unittest
from pathlib import Path
from urllib.request import urlopen
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location("gatsby_server", Path(__file__).resolve().parent.parent / "server.py")
server_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server_module)


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = server_module.LocalHTTPServer(("127.0.0.1", 0), server_module.AppHandler)
        cls.url = f"http://127.0.0.1:{cls.server.server_address[1]}"
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_serves_built_react_entry(self):
        with urlopen(self.url) as response:
            html = response.read().decode()
            self.assertIn("Gatsby", html)
            self.assertIn("/assets/", html)
            self.assertNotIn("/src/main.tsx", html)
            self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_build_identification(self):
        with urlopen(self.url + "/__gatsby_health") as response:
            health = json.load(response)
            self.assertEqual(health["app"], "Gatsby")
            self.assertEqual(health["build"], server_module.build_id())

    def test_another_server_cannot_take_the_same_port(self):
        duplicate = None
        try:
            with self.assertRaises(OSError):
                duplicate = server_module.ThreadingHTTPServer(self.server.server_address, server_module.AppHandler)
        finally:
            if duplicate:
                duplicate.server_close()

    def test_does_not_expose_project_or_directory_listing(self):
        for path in ["/server.py", "/package.json", "/assets/", "/../server.py", "/.git/config"]:
            with self.subTest(path=path), self.assertRaises(HTTPError) as error:
                urlopen(self.url + path)
            self.assertEqual(error.exception.code, 404)

    def test_artwork_is_local(self):
        with urlopen(self.url + "/gatsby-logo.webp") as response:
            self.assertIn("image/", response.headers["Content-Type"])
            self.assertGreater(len(response.read()), 1000)


if __name__ == "__main__":
    unittest.main()
