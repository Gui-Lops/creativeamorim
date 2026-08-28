import http.server
import socketserver
import os
import io
import threading

PORT = 8000

class RangeHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()
        
        range_header = self.headers.get('Range')
        if not range_header:
            f = open(path, 'rb')
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Length', str(os.path.getsize(path)))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            return f
            
        try:
            total_size = os.path.getsize(path)
            range_type, range_spec = range_header.split('=', 1)
            if range_type.strip() != 'bytes':
                return super().send_head()

            # Single range only (ignore multi-range: "a,b" takes the first)
            parts = range_spec.strip().split(',')[0].split('-')
            start_str = parts[0].strip()
            end_str = parts[1].strip() if len(parts) > 1 else ''

            if start_str == '' and end_str == '':
                start, end = 0, total_size - 1
            elif start_str == '':
                # Suffix range: "bytes=-N" -> last N bytes
                suffix_len = int(end_str)
                start = max(total_size - suffix_len, 0)
                end = total_size - 1
            else:
                start = int(start_str)
                end = int(end_str) if end_str else total_size - 1

            if end >= total_size:
                end = total_size - 1
            if start > end or start >= total_size:
                self.send_error(416, 'Range Not Satisfiable')
                return None

            with open(path, 'rb') as f:
                f.seek(start)
                length = end - start + 1
                data = f.read(length)

            self.send_response(206)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Range', f'bytes {start}-{end}/{total_size}')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            return io.BytesIO(data)
        except Exception as e:
            return super().send_head()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), RangeHTTPHandler) as httpd:
        httpd.daemon_threads = True
        print(f"Serving HTTP on port {PORT} with full HTTP 206 Partial Content Range support...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
