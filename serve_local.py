import http.server
import socketserver
import os

PORT = 8000

class GitHubPagesHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Translate the URL path to a local file path
        path = self.translate_path(self.path)
        
        # If the file doesn't exist, reroute to 404.html
        if not os.path.exists(path):
            self.path = '/404.html'
            
        return super().do_GET()

print(f"Starting GitHub Pages local simulator on port {PORT}...")
with socketserver.TCPServer(("", PORT), GitHubPagesHandler) as httpd:
    httpd.serve_forever()
