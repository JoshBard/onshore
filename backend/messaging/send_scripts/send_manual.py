import os
import sys
import subprocess
from datetime import datetime

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
LOG_FILE = os.path.join(SCRIPT_DIR, "transmit_messages.log")
LAST_MANUAL_FILE = os.path.join(SCRIPT_DIR, "last_manual_message.log")
CHANNEL_INDEX = "5"

# --- Logging ---
def log_message(status, message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"{timestamp} | TYPE: MAN | STATUS: {status} | MESSAGE: {message}"
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
    log_message("FAILED", "No manual message provided.")
    sys.exit(1)

message_content = sys.argv[1].upper()
final_message = f"MAN_{message_content}"

# --- Check for duplicate ---
if os.path.exists(LAST_MANUAL_FILE):
    with open(LAST_MANUAL_FILE, "r") as f:
        last_sent = f.read().strip()
    if last_sent == final_message:
        log_message("SKIPPED", f"Duplicate message: {final_message}")
        sys.exit(0)

# --- Send message via CLI ---
result = subprocess.run([
    "meshtastic",
    "--ch-index", CHANNEL_INDEX,
    "--sendtext", final_message
], capture_output=True)

if result.returncode == 0:
    log_message("SUCCESS", final_message)
    with open(LAST_MANUAL_FILE, "w") as f:
        f.write(final_message)
else:
    log_message("FAILED", f"{final_message} | {result.stderr.decode().strip()}")
    sys.exit(1)
