#!/usr/bin/env python3
"""
preview_server.py
-----------------
Tiny HTTP server to preview the generated website in your browser.

Usage:
  python preview_server.py                       # serves ./output (latest site)
  python preview_server.py output/site_20240101  # serves a specific folder
  python preview_server.py --port 8080           # custom port
"""

import sys
import os
import argparse
import webbrowser
import http.server
import socketserver
from pathlib import Path


def find_latest_site(output_dir: Path) -> Path | None:
    """Return the most recently created site_* subdirectory."""
    candidates = sorted(
        (d for d in output_dir.iterdir() if d.is_dir() and d.name.startswith("site_")),
        key=lambda d: d.stat().st_mtime,
        reverse=True,
    )
    return candidates[0] if candidates else None


def serve(directory: Path, port: int):
    os.chdir(directory)

    handler = http.server.SimpleHTTPRequestHandler

    with socketserver.TCPServer(("", port), handler) as httpd:
        url = f"http://localhost:{port}"
        print(f"\n🌐  Serving: {directory}")
        print(f"   URL    : {url}")
        print(f"   Press Ctrl+C to stop.\n")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


def main():
    parser = argparse.ArgumentParser(description="Preview a generated website")
    parser.add_argument(
        "directory",
        nargs="?",
        help="Path to the site directory (default: latest in ./output)",
    )
    parser.add_argument(
        "--port", "-p",
        type=int,
        default=int(os.getenv("PREVIEW_PORT", "8000")),
        help="Port to serve on (default: 8000)",
    )
    args = parser.parse_args()

    if args.directory:
        site_dir = Path(args.directory).resolve()
    else:
        output_dir = Path(os.getenv("OUTPUT_DIR", "output")).resolve()
        if not output_dir.exists():
            print(f"Output directory not found: {output_dir}")
            print("Run web_builder_agent.py first to generate a website.")
            sys.exit(1)
        site_dir = find_latest_site(output_dir)
        if site_dir is None:
            print(f"No site_* directories found in {output_dir}")
            print("Run web_builder_agent.py first to generate a website.")
            sys.exit(1)

    if not site_dir.exists():
        print(f"Directory not found: {site_dir}")
        sys.exit(1)

    serve(site_dir, args.port)


if __name__ == "__main__":
    main()
