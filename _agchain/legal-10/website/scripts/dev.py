import os
import sys
import subprocess
import socket
import http.server
import socketserver
from functools import partial

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WEBSITE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
PORT = int(os.environ.get("LEGALCHAIN_PORT", "3000"))
DIRECTORY = os.path.join(WEBSITE_DIR, "public")


class ExclusiveTCPServer(socketserver.TCPServer):
    allow_reuse_address = False

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex(("127.0.0.1", port)) == 0

def run_validation():
    print(">> Validating site HTML...")
    script_path = os.path.join(SCRIPT_DIR, "validate_site_html.py")
    if os.path.exists(script_path):
        result = subprocess.run([sys.executable, script_path], capture_output=False, cwd=WEBSITE_DIR)
        if result.returncode != 0:
            print("xx Validation failed!")
            return False
    else:
        print(f"xx Validation script not found at {script_path}")
    return True

def serve():
    if is_port_in_use(PORT):
        print(f"xx Port {PORT} is already in use. Stop the other server or set LEGALCHAIN_PORT to another port.")
        return False

    print(f">> Serving '{DIRECTORY}' on http://localhost:{PORT}")
    
    handler = partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)
    
    try:
        with ExclusiveTCPServer(("", PORT), handler) as httpd:
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n>> Server stopped.")
                sys.exit(0)
    except OSError as e:
        print(f"xx Error starting server: {e}")
        return False

    return True

if __name__ == "__main__":
    if run_validation():
        ok = serve()
        if not ok:
            sys.exit(1)
