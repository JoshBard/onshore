import os
import sys
import subprocess
from backend.messaging.send_scripts.transmit_logger import log_message

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
CHANNEL_INDEX = "5"

# --- Argument check ---
if len(sys.argv) != 2:
    log_message("FAILED", "MSSN", "No mission message provided.")
    sys.exit(1)

message_content = f"MSSN_{sys.argv[1].upper()}"
final_message = message_content

# --- Send via meshtastic CLI ---
result = subprocess.run([
    "meshtastic",
    "--ch-index", CHANNEL_INDEX,
    "--sendtext", final_message
], capture_output=True)

if result.returncode == 0:
    log_message("SUCCESS", "MSSN", final_message)
else:
    error = result.stderr.decode().strip()
    log_message("FAILED", "MSSN", f"{final_message} | {error}")
    sys.exit(1)
