import os
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
LOG_FILE = os.path.join(SCRIPT_DIR, "transmit_messages.log")

def log_message(status, msg_type, content):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"{timestamp} | TYPE: {msg_type} | STATUS: {status} | MESSAGE: {content}"
    print(line)

    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

    # Keep only last 50 lines
    with open(LOG_FILE, "r") as f:
        lines = f.readlines()[-50:]
    with open(LOG_FILE, "w") as f:
        f.writelines(lines)