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

if ! command -v lsof >/dev/null 2>&1; then
  printf 'Error: lsof is required to identify the process using port %s.\n' "$port" >&2
  exit 1
fi

listener_pids=$(lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$listener_pids" ]; then
  printf 'Stopping the process(es) listening on port %s: %s\n' "$port" "$(printf '%s' "$listener_pids" | tr '\n' ' ')"
  for pid in $listener_pids; do
    case "$pid" in
      ''|*[!0-9]*)
        printf 'Error: lsof returned an invalid process ID: %s\n' "$pid" >&2
        exit 1
        ;;
    esac
    if ! kill -TERM "$pid" 2>/dev/null; then
      printf 'Error: could not stop process %s listening on port %s.\n' "$pid" "$port" >&2
      exit 1
    fi
  done

  if ! python3 - "$port" <<'PY'
import socket
import sys
import time

port = int(sys.argv[1])
deadline = time.monotonic() + 5
while time.monotonic() < deadline:
    try:
        with socket.socket() as server_socket:
            server_socket.bind(("127.0.0.1", port))
        break
    except OSError:
        time.sleep(0.1)
else:
    print(f"Error: port {port} is still in use after stopping its listener.", file=sys.stderr)
    sys.exit(1)
PY
  then
    exit 1
  fi
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
    print("Check which process is using the port and stop it before retrying.", file=sys.stderr)
    sys.exit(1)
PY
then
  exit 1
fi

cd "$project_dir"
printf 'Serving Fidelat at http://127.0.0.1:%s\n' "$port"
exec python3 -m http.server "$port" --bind 127.0.0.1
