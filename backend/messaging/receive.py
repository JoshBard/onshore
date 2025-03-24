import os
import time
from datetime import datetime
from meshtastic.tcp_interface import TCPInterface
from pubsub import pub
import subprocess
from backend.messaging.receive_scripts.receive_logger import log_message

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
PROCESSED_IDS_FILE = os.path.join(SCRIPT_DIR, ".processed_msg_ids")
LOCATION_UPDATE = os.path.join(SCRIPT_DIR, "receive_scripts", "location_receive.py")
SOURCE_ID = "!eb15a9fe"

os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
if not os.path.exists(PROCESSED_IDS_FILE):
    with open(PROCESSED_IDS_FILE, "w") as f:
        pass

def is_duplicate(msg_id):
    with open(PROCESSED_IDS_FILE, "r") as f:
        seen_ids = set(line.strip() for line in f)
    return msg_id in seen_ids

def mark_processed(msg_id):
    with open(PROCESSED_IDS_FILE, "a") as f:
        f.write(f"{msg_id}\n")

# --- Dispatcher ---
def handle_message(packet, interface):
    from_id = packet.get("fromId", "")
    if from_id != SOURCE_ID:
        return

    decoded = packet.get("decoded", {})
    message = decoded.get("text", "")
    msg_id = str(packet.get("id", ""))

    if not message or is_duplicate(msg_id):
        return

    mark_processed(msg_id)

    if message.startswith("LOC_"):
        clean_message = message.replace("LOC_", "")
        log_message("RECEIVED", "LOC", message)
        subprocess.Popen(["python3", LOCATION_UPDATE, clean_message])
    else:
        log_message("FAILED", "UNKNOWN", f"Unrecognized message format: {message}")

# --- Main ---
if __name__ == "__main__":
    print(f"Listening for Meshtastic messages from {SOURCE_ID}...")

    interface = TCPInterface(hostname="localhost")
    pub.subscribe(handle_message, "meshtastic.receive")

    try:
        while True:
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("Shutting down...")
        interface.close()