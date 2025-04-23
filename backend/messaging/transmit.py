#!/usr/bin/env python3
import sys
import requests

USAGE = "Usage: transmit.py <MAN|MSSN|WP> [payload]"

if len(sys.argv) < 2:
    print(USAGE, file=sys.stderr)
    sys.exit(1)

mtype   = sys.argv[1].upper()
payload = sys.argv[2] if len(sys.argv) > 2 else None

try:
    resp = requests.post(
        "http://127.0.0.1:5000/send",
        json={"type": mtype, "payload": payload},
        timeout=3
    )
    resp.raise_for_status()
    print(f"Queued {mtype} {payload or ''}")
except Exception as e:
    print(f"Error queueing {mtype}: {e}", file=sys.stderr)
    sys.exit(1)
