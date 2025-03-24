import os
import sys
import subprocess
from datetime import datetime
from send_scripts.transmit_logger import log_message

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
SEND_DIR = os.path.join(SCRIPT_DIR, "send_scripts")

# --- Argument check ---
if len(sys.argv) < 2:
    log_message("FAILED", "UNKNOWN", "No message type provided.")
    sys.exit(1)

message_type = sys.argv[1].upper()

# --- Dispatch ---
if message_type == "WP":
    try:
        subprocess.run(["python3", os.path.join(SEND_DIR, "send_waypoints.py")], check=True)
    except subprocess.CalledProcessError as e:
        log_message("FAILED", "WP", f"send_waypoints.py error: {e}")
        sys.exit(1)

elif message_type == "MAN":
    if len(sys.argv) < 3:
        log_message("FAILED", "MAN", "No manual command provided.")
        sys.exit(1)
    command = sys.argv[2]
    subprocess.run(["python3", os.path.join(SEND_DIR, "send_manual.py"), command], check=True)

elif message_type == "MSSN":
    if len(sys.argv) < 3:
        log_message("FAILED", "MSSN", "No mission command provided.")
        sys.exit(1)
    command = sys.argv[2]
    subprocess.run(["python3", os.path.join(SEND_DIR, "send_mission.py"), command], check=True)

else:
    log_message("FAILED", message_type, "Invalid message type.")
    sys.exit(1)
