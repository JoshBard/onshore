import os
import sys
import subprocess
from datetime import datetime

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
LOG_FILE = os.path.join(SCRIPT_DIR, "transmit_messages.log")
CHANNEL_INDEX = "5"

# --- Logging ---
def log_message(status, message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"{timestamp} | TYPE: MSSN | STATUS: {status} | MESSAGE: {message}"
    print(line)

    with open(LOG_FILE, "a") as log_file:
        log_file.write(line + "\n")

    # Keep only last 50 lines
    with open(LOG_FILE, "r") as f:
        lines = f.readlines()[-50:]
    with open(LOG_FILE, "w") as f:
        f.writelines(lines)

# --- Argument check ---
if len(sys.argv) != 2:
    log_message("FAILED", "No mission message provided.")
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
    log_message("SUCCESS", final_message)
else:
    error = result.stderr.decode().strip()
    log_message("FAILED", f"{final_message} | {error}")
    sys.exit(1)
