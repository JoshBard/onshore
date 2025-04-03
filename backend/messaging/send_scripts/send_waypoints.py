import os
import time
from meshtastic.tcp_interface import TCPInterface
from transmit_logger import log_message

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
CSV_FILE = os.path.abspath(os.path.join(SCRIPT_DIR, "../../waypoints/waypoints.csv"))
CHANNEL_INDEX = 5
ACK_DELAY = 0.5

# --- Load CSV ---
if not os.path.exists(CSV_FILE):
    log_message("FAILED", "WP", f"ERROR: CSV file not found at {CSV_FILE}")
    exit(1)

with open(CSV_FILE, "r") as f:
    lines = f.readlines()

if len(lines) <= 1:
    log_message("FAILED", "WP", "CSV is empty or contains only a header — nothing to send.")
    exit(1)

rows = [line.strip() for line in lines[1:]]  # Skip header

# --- Connect to Meshtastic ---
interface = TCPInterface(hostname="localhost")
time.sleep(2)  # Let connection settle

# --- Send each row ---
for index, row in enumerate(rows):
    message = f"WP_{index}:{row}"
    log_message("SUCCESS", "WP", f"Sending row {index + 1} / {len(rows)}: {row}")
    interface.sendText(text=message, channelIndex=CHANNEL_INDEX, wantAck=True)
    time.sleep(ACK_DELAY)

# --- Send completion message ---
interface.sendText("WP_FINISHED", channelIndex=CHANNEL_INDEX, wantAck=True)
log_message("SUCCESS", "WP", "All rows sent.")
interface.close()
