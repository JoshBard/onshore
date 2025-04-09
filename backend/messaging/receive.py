#!/usr/bin/env python3
import os
import sys
import time
import subprocess
from datetime import datetime
from meshtastic.tcp_interface import TCPInterface
from pubsub import pub
from receive_scripts.receive_logger import log_message

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
PROCESSED_IDS_FILE = os.path.join(SCRIPT_DIR, ".processed_msg_ids")
TELEM_UPDATE = os.path.join(SCRIPT_DIR, "receive_scripts", "telem_receive.py")
SOURCE_ID = "!eb15a9fe"

# File for exposing connection status to the UI.
STATUS_FILE = os.path.join(SCRIPT_DIR, "connection_status.txt")

# Global connection variables
is_connected = False
last_tlm_time = None

# --- Utility Functions for Processed IDs and Connection Status ---
def update_status_file(status):
    """Write connection status to a file for the UI (or other processes) to read."""
    with open(STATUS_FILE, "w") as f:
        f.write("connected" if status else "disconnected")

if not os.path.exists(PROCESSED_IDS_FILE):
    with open(PROCESSED_IDS_FILE, "w") as f:
        pass

def is_duplicate(msg_id):
    with open(PROCESSED_IDS_FILE, "r") as f:
        seen_ids = set(line.strip() for line in f)
    return msg_id in seen_ids

def mark_processed(msg_id):
    with open(PROCESSED_IDS_FILE, "a") as f:
        f.write(f"{msg_id}\n")

# --- Connection Monitor Thread ---
def connection_monitor():
    """Check every 10 seconds whether a TLM message has been received within 2 minutes.
       If not, mark the connection as lost."""
    global is_connected, last_tlm_time
    while True:
        time.sleep(10)
        if last_tlm_time is not None:
            elapsed = time.time() - last_tlm_time
            if elapsed > 120:  # 2 minutes timeout
                if is_connected:
                    is_connected = False
                    update_status_file(False)
                    log_message("INFO", "CONN", "No TLM received for 2 minutes; marked as disconnected.")
        else:
            if is_connected:
                is_connected = False
                update_status_file(False)
                log_message("INFO", "CONN", "No TLM received; marked as disconnected.")

# --- Message Dispatcher ---
def handle_message(packet, interface):
    global is_connected, last_tlm_time
    from_id = packet.get("fromId", "")
    if from_id != SOURCE_ID:
        return

    decoded = packet.get("decoded", {})
    message = decoded.get("text", "")
    msg_id = str(packet.get("id", ""))
    if not message or is_duplicate(msg_id):
        return
    mark_processed(msg_id)

    # If we receive the startup request from the other node...
    if message == "STARTUP_READY_TO_GO":
        log_message("RECEIVED", "STARTUP", message)
        try:
            # Respond with the acknowledged message.
            interface.sendText("STARTUP_ACKNOWLEDGED", channelIndex=5, wantAck=True)
            is_connected = True
            last_tlm_time = time.time()
            update_status_file(True)
            log_message("SUCCESS", "STARTUP", "Sent STARTUP_ACKNOWLEDGED in response.")
        except Exception as e:
            log_message("FAILED", "STARTUP", f"Error sending STARTUP_ACKNOWLEDGED: {e}")

    # When we receive a telemetry update...
    elif message.startswith("TLM"):
        clean_message = message.replace("TLM_", "")
        last_tlm_time = time.time()
        log_message("RECEIVED", "TLM", message)
        subprocess.Popen(["python3", TELEM_UPDATE, clean_message])
    else:
        log_message("FAILED", "UNKNOWN", f"Unrecognized message format: {message}")

# --- Main Listening Loop ---
if __name__ == "__main__":
    print(f"Listening for Meshtastic messages from {SOURCE_ID}...")
    
    # Start the connection monitor thread.
    monitor_thread = threading.Thread(target=connection_monitor, daemon=True)
    monitor_thread.start()

    # Create the TCPInterface and subscribe to receive channel.
    interface = TCPInterface(hostname="localhost")
    pub.subscribe(handle_message, "meshtastic.receive")
    
    try:
        while True:
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("Shutting down...")
        interface.close()
