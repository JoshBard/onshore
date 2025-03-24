import os
import sys
import subprocess
from transmit_logger import log_message

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
LAST_MANUAL_FILE = os.path.join(SCRIPT_DIR, "last_manual_message.log")
CHANNEL_INDEX = "5"

# --- Argument check ---
if len(sys.argv) != 2:
    log_message("FAILED", "MAN", "No manual direction provided.")
    sys.exit(1)

message_content = sys.argv[1].upper()
final_message = f"MAN_{message_content}"

# --- Check for duplicate ---
if os.path.exists(LAST_MANUAL_FILE):
    with open(LAST_MANUAL_FILE, "r") as f:
        last_sent = f.read().strip()
    if last_sent == final_message:
        sys.exit(0)

# --- Send message via CLI ---
result = subprocess.run([
    "meshtastic",
    "--ch-index", CHANNEL_INDEX,
    "--sendtext", final_message
], capture_output=True)

if result.returncode == 0:
    with open(LAST_MANUAL_FILE, "w") as f:
        f.write(final_message)
    log_message("SUCCESS", "MAN", f"{final_message} | {result.stdout.decode()}")
else:
    log_message("FAILED", "MAN", f"{final_message} | {result.stderr.decode()}")
    sys.exit(1)
