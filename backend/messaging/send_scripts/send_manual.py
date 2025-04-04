import os
import sys
import subprocess
from transmit_logger import log_message

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
CHANNEL_INDEX = "5"

# --- Argument check ---
if len(sys.argv) != 2:
    log_message("FAILED", "MAN", "No manual direction provided.")
    sys.exit(1)

message_content = sys.argv[1].upper()
final_message = f"MAN_{message_content}"

# --- Send message via CLI ---
result = subprocess.run([
    "meshtastic",
    "--ch-index", CHANNEL_INDEX,
    "--sendtext", final_message
], capture_output=True)

if result.returncode == 0:
    log_message("SUCCESS", "MAN", f"{final_message} | {result.stdout.decode()}")
else:
    log_message("FAILED", "MAN", f"{final_message} | {result.stderr.decode()}")
    sys.exit(1)
