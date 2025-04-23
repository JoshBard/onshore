#!/usr/bin/env python3
import time
import csv
import random
import threading
import socket
from datetime import datetime

from pubsub import pub
import meshtastic.tcp_interface

import config

# Placeholder for the TCPInterface once we instantiate it below
INTERFACE = None

# Connection tracking
is_connected = False
last_tlm_time = None
connection_lock = threading.Lock()

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except:
        return "127.0.0.1"
    finally:
        s.close()

def update_status_file(status: bool):
    config.STATUS_FILE.write_text("connected" if status else "disconnected")

def ensure_csv():
    config.TELEM_CSV.parent.mkdir(parents=True, exist_ok=True)
    if not config.TELEM_CSV.exists():
        with config.TELEM_CSV.open("w", newline="") as f:
            csv.writer(f).writerow(config.CSV_HEADER)

def is_duplicate(msg_id: str) -> bool:
    if not config.PROCESSED_IDS_FILE.exists():
        config.PROCESSED_IDS_FILE.write_text("")
    seen = set(config.PROCESSED_IDS_FILE.read_text().splitlines())
    return msg_id in seen

def mark_processed(msg_id: str):
    config.PROCESSED_IDS_FILE.write_text(
        config.PROCESSED_IDS_FILE.read_text() + msg_id + "\n"
    )

def trim_csv():
    rows = list(csv.reader(config.TELEM_CSV.open()))
    if len(rows) - 1 > config.MAX_ENTRIES:
        kept = [rows[0]] + rows[-config.MAX_ENTRIES:]
        with config.TELEM_CSV.open("w", newline="") as f:
            csv.writer(f).writerows(kept)

def process_telem_update(raw: str):
    # Strip the "TELEM_" prefix
    if raw.startswith("TELEM_"):
        raw = raw[len("TELEM_"):]
    parts = dict(item.split("=", 1) for item in raw.split("|") if "=" in item)
    for k in config.EXPECTED_KEYS:
        parts.setdefault(k, "")
    if not parts["LAT"] or not parts["LON"]:
        print("Telemetry dropped: missing LAT/LON")
        return

    row = [
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        *(parts[k] for k in config.EXPECTED_KEYS),
        random.randint(0, 99)
    ]
    try:
        with config.TELEM_CSV.open("a", newline="") as f:
            csv.writer(f).writerow(row)
    except Exception as e:
        print("Error appending telemetry:", e)
    else:
        trim_csv()

def connection_monitor():
    global is_connected, last_tlm_time
    while True:
        time.sleep(10)
        with connection_lock:
            if last_tlm_time is None or (time.time() - last_tlm_time) > 120:
                if is_connected:
                    is_connected = False
                    update_status_file(False)
                    print("Connection lost")

def handle_message(packet, interface=None):
    """Callback for every incoming packet on the mesh."""
    global is_connected, last_tlm_time
    try:
        if packet.get("fromId") != config.SOURCE_ID:
            return

        text = packet.get("decoded", {}).get("text", "")
        if not text:
            return

        msg_id = str(packet.get("id", ""))
        if is_duplicate(msg_id):
            return
        mark_processed(msg_id)

        # Always print the raw message
        print(f"[MSG {msg_id}] {text}")

        if text.startswith("TLM_"):
            # Telemetry branch
            with connection_lock:
                is_connected = True
                last_tlm_time = time.time()
            update_status_file(True)
            process_telem_update(text)

        elif text.startswith("STAT_"):
            # STAT messages are simply printed
            print(f"[STAT] {text[len('STAT_'):]}")

        else:
            print(f"[UNKNOWN] {text}")

    except Exception as e:
        # Catch *everything* so we never drop out of the callback
        print("Error in handle_message:", e)

# Subscribe *before* creating the interface
pub.subscribe(handle_message, "meshtastic.receive")

if __name__ == "__main__":
    # Prepare files & status
    ensure_csv()
    update_status_file(False)

    # Start the connection-monitor thread
    threading.Thread(target=connection_monitor, daemon=True).start()

    # Now that our handler is in place, connect
    INTERFACE = meshtastic.tcp_interface.TCPInterface(hostname=config.MESHTASTIC_HOST)
    print(f"Listening for Meshtastic messages from {config.SOURCE_ID}…")

    try:
        while True:
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("Shutting down…")
        INTERFACE.close()
