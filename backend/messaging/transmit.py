#!/usr/bin/env python3
import os
import sys
import subprocess
import queue
import threading
import time

# Import your logger module.
from transmit_logger import log_message

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
SEND_DIR = os.path.join(SCRIPT_DIR, "send_scripts")
# The CHANNEL_INDEX for meshtastic commands.
CHANNEL_INDEX = "5"
# CSV file location for waypoints.
CSV_FILE = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "waypoints", "waypoints.csv"))
# Delay between waypoint sends (seconds).
ACK_DELAY = 0.5

# --- Create a task queue ---
send_queue = queue.Queue()

# --- Task Functions ---
def process_manual(command):
    """
    Sends a manual (MAN) command. The final message is composed with a MAN_ prefix.
    """
    message_content = command.upper()
    final_message = f"MAN_{message_content}"
    try:
        result = subprocess.run([
            "meshtastic",
            "--ch-index", CHANNEL_INDEX,
            "--sendtext", final_message
        ], capture_output=True, text=True)
        if result.returncode == 0:
            log_message("SUCCESS", "MAN", f"{final_message} | {result.stdout.strip()}")
        else:
            log_message("FAILED", "MAN", f"{final_message} | {result.stderr.strip()}")
    except Exception as e:
        log_message("FAILED", "MAN", f"{final_message} | Exception: {e}")

def process_mission(command):
    """
    Sends a mission (MSSN) command. The final message is composed with a MSSN_ prefix.
    """
    message_content = command.upper()
    final_message = f"MSSN_{message_content}"
    try:
        result = subprocess.run([
            "meshtastic",
            "--ch-index", CHANNEL_INDEX,
            "--sendtext", final_message
        ], capture_output=True, text=True)
        if result.returncode == 0:
            log_message("SUCCESS", "MSSN", final_message)
        else:
            log_message("FAILED", "MSSN", f"{final_message} | {result.stderr.strip()}")
    except Exception as e:
        log_message("FAILED", "MSSN", f"{final_message} | Exception: {e}")

def process_waypoints():
    """
    Loads a CSV file of waypoints, sends each row with a WP_<index>:<row> format over Meshtastic,
    and then sends a WP_FINISHED message.
    """
    if not os.path.exists(CSV_FILE):
        log_message("FAILED", "WP", f"ERROR: CSV file not found at {CSV_FILE}")
        return

    with open(CSV_FILE, "r") as f:
        lines = f.readlines()

    if len(lines) <= 1:
        log_message("FAILED", "WP", "CSV is empty or contains only a header — nothing to send.")
        return

    rows = [line.strip() for line in lines[1:]]  # Skip header

    # Import TCPInterface only when needed.
    from meshtastic.tcp_interface import TCPInterface
    interface = TCPInterface(hostname="localhost")
    time.sleep(2)  # Allow connection to settle

    for index, row in enumerate(rows):
        message = f"WP_{index}:{row}"
        log_message("SUCCESS", "WP", f"Sending row {index+1} / {len(rows)}: {row}")
        # Send with acknowledgment request.
        interface.sendText(text=message, channelIndex=int(CHANNEL_INDEX), wantAck=True)
        time.sleep(ACK_DELAY)

    # Send the finish message.
    interface.sendText("WP_FINISHED", channelIndex=int(CHANNEL_INDEX), wantAck=True)
    log_message("SUCCESS", "WP", "All rows sent.")
    interface.close()

# --- Worker Thread Function ---
def worker():
    """
    Worker thread that loops over tasks from the send_queue.
    The task tuple is of the form (task_type, payload).
    """
    while True:
        task = send_queue.get()
        if task is None:  # Shutdown signal
            break

        task_type, payload = task
        if task_type == "MAN":
            process_manual(payload)
        elif task_type == "MSSN":
            process_mission(payload)
        elif task_type == "WP":
            process_waypoints()
        else:
            log_message("FAILED", task_type, "Unknown task type")
        send_queue.task_done()

# Start the worker thread (daemon mode).
worker_thread = threading.Thread(target=worker, daemon=True)
worker_thread.start()

# --- Main Dispatch ---
def main():
    if len(sys.argv) < 2:
        log_message("FAILED", "UNKNOWN", "No message type provided.")
        sys.exit(1)

    message_type = sys.argv[1].upper()

    if message_type == "WP":
        send_queue.put(("WP", None))
    elif message_type == "MAN":
        if len(sys.argv) < 3:
            log_message("FAILED", "MAN", "No manual command provided.")
            sys.exit(1)
        command = sys.argv[2]
        send_queue.put(("MAN", command))
    elif message_type == "MSSN":
        if len(sys.argv) < 3:
            log_message("FAILED", "MSSN", "No mission command provided.")
            sys.exit(1)
        command = sys.argv[2]
        send_queue.put(("MSSN", command))
    else:
        log_message("FAILED", message_type, "Invalid message type.")
        sys.exit(1)

    # Wait for the tasks to complete.
    send_queue.join()

    # Signal the worker thread to exit.
    send_queue.put(None)
    worker_thread.join()

if __name__ == "__main__":
    main()
