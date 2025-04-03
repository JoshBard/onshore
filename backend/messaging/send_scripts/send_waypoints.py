import os
import base64
import gzip
import time
from meshtastic.tcp_interface import TCPInterface
from transmit_logger import log_message

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
CSV_FILE = os.path.abspath(os.path.join(SCRIPT_DIR, "../../waypoints/waypoints.csv"))
CHUNK_SIZE = 222
CHANNEL_INDEX = 5
ACK_DELAY = 0.5

# --- Load and compress the CSV ---
if not os.path.exists(CSV_FILE):
    log_message("FAILED", "WP", "ERROR: CSV file not found at {CSV_FILE}")
    exit(1)

with open(CSV_FILE, 'rb') as f:
    lines = f.readlines()[1:]  # Skip CSV header
    compressed = gzip.compress(b''.join(lines))
    encoded = base64.b64encode(compressed).decode('ascii')

# --- Split into chunks ---
chunks = [encoded[i:i+CHUNK_SIZE] for i in range(0, len(encoded), CHUNK_SIZE)]
total_chunks = len(chunks)
print(f"Prepared {total_chunks} chunks for transmission")

# --- Connect to Meshtastic via TCP ---
interface = TCPInterface(hostname="localhost")
time.sleep(2)  # Let the connection settle

# --- Send each chunk with ack ---
for index, chunk in enumerate(chunks):
    message = f"WP_{index}:{chunk}"
    log_message("SUCCESS", "WP", f"Sending chunk {index + 1} / {total_chunks}")
    interface.sendText(
        text=message,
        channelIndex=CHANNEL_INDEX,
        wantAck=True
    )
    time.sleep(ACK_DELAY)

# --- Send completion message ---
interface.sendText("WP_FINISHED", channelIndex=CHANNEL_INDEX, wantAck=True)
log_message("SUCCESS", "WP", "All chunks deliver")
interface.close()
