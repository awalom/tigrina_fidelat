#!/bin/sh
set -eu

if [ "$#" -gt 0 ]; then
  printf 'Usage: %s\n' "$0" >&2
  exit 2
fi

port=8000
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if ! command -v python3 >/dev/null 2>&1; then
  printf 'Error: python3 is required to run the local server.\n' >&2
  exit 1
fi

if ! python3 - "$port" <<'PY'
import socket
import sys

try:
    port = int(sys.argv[1])
    if not 1 <= port <= 65535:
        raise ValueError("port must be between 1 and 65535")
    with socket.socket() as server_socket:
        server_socket.bind(("127.0.0.1", port))
except (OSError, ValueError) as error:
    print(f"Error: port {sys.argv[1]} is unavailable ({error}).", file=sys.stderr)
    print("Stop the process using port 8000, then run this script again.", file=sys.stderr)
    sys.exit(1)
PY
then
  exit 1
fi

cd "$project_dir"
printf 'Serving Fidelat at http://127.0.0.1:%s\n' "$port"
exec python3 -m http.server "$port" --bind 127.0.0.1
