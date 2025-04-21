#!/usr/bin/env python3
import os
import sys
import time
import subprocess
import csv
import random
import threading
import requests 
import socket
from datetime import datetime
from meshtastic.tcp_interface import TCPInterface
from pubsub import pub
from receive_logger import log_message
from dotenv import load_dotenv
from pathlib import Path

# --- Load environment variable ---
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
PROCESSED_IDS_FILE = os.path.join(SCRIPT_DIR, ".processed_msg_ids")
SOURCE_ID = "!eb15a9fe"

# --- IP finder ---
def get_local_ip():
    """Return the current machine’s primary IPv4 address on the LAN."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # the address here doesn’t actually have to be reachable
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

# File for exposing connection status to the UI.
STATUS_FILE = os.path.join(SCRIPT_DIR, "connection_status.txt")

# Telemetry CSV configuration
TELEM_CSV = os.path.join(SCRIPT_DIR, "../../telemetry_data/live_telem.csv")
MAX_ENTRIES = 1000  # Maximum number of data rows (excluding header)
EXPECTED_KEYS = ["BATT", "CUR", "LVL", "GPS_FIX", "GPS_SATS", "LAT", "LON", "ALT", "MODE"]
CSV_HEADER = ["timestamp"] + EXPECTED_KEYS + ["sensor_data"]

is_connected = False
last_tlm_time = None

connection_lock = threading.Lock()

# --- Ensure the Telemetry CSV Exists ---
def ensure_csv(file_path, header):
    # Create the directory if it doesn't exist.
    dir_path = os.path.dirname(file_path)
    os.makedirs(dir_path, exist_ok=True)
    if not os.path.isfile(file_path):
        with open(file_path, mode="w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(header)
        log_message("INFO", "TLM", f"CSV created with header at {file_path}")

ensure_csv(TELEM_CSV, CSV_HEADER)

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

# --- Telemetry Update Processing ---
def trim_csv(file_path, max_entries):
    with open(file_path, mode="r", newline="") as f:
        reader = csv.reader(f)
        rows = list(reader)
    # rows[0] is the header; if the number of data rows exceeds max_entries, trim them.
    if len(rows) - 1 <= max_entries:
        return
    header = rows[0]
    trimmed_rows = [header] + rows[-max_entries:]
    with open(file_path, mode="w", newline="") as f:
        writer = csv.writer(f)
        writer.writerows(trimmed_rows)
    log_message("INFO", "TLM", f"CSV trimmed to last {max_entries} entries.")

def process_telem_update(telem_update):
    """
    Process the telemetry update string and append data to the CSV.
    Expected format: KEY=VALUE|KEY=VALUE|...
    """
    # Remove "TELEM_" prefix if present.
    if telem_update.startswith("TELEM_"):
        telem_update = telem_update[len("TELEM_"):]
    
    # Parse telemetry update.
    fields = telem_update.split("|")
    telem_data = {}
    for field in fields:
        if "=" in field:
            key, value = field.split("=", 1)
            telem_data[key.strip()] = value.strip()
    
    # Fill in missing keys with empty strings.
    for key in EXPECTED_KEYS:
        if key not in telem_data:
            telem_data[key] = ""
    
    # Ensure location data is present.
    if telem_data["LAT"] == "" or telem_data["LON"] == "":
        log_message("FAILED", "TLM", "Location data (LAT and LON) not found in telemetry update.")
        return
    
    # Generate timestamp and random sensor data.
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sensor_data_telem = random.randint(0, 99)
    
    # Construct the row.
    row = [timestamp] + [telem_data[key] for key in EXPECTED_KEYS] + [sensor_data_telem]
    
    try:
        with open(TELEM_CSV, mode="a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(row)
        log_message("SUCCESS", "TLM", f"Appended telemetry data at {timestamp}")
    except Exception as e:
        log_message("FAILED", "TLM", f"Error appending telemetry data: {e}")
    
    trim_csv(TELEM_CSV, MAX_ENTRIES)

# --- Connection Monitor Thread ---
def connection_monitor():
    """Check every 10 seconds whether a TLM message has been received within 2 minutes.
       If not, mark the connection as lost."""
    global is_connected, last_tlm_time
    while True:
        time.sleep(10)
        with connection_lock:
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
                    log_message("INFO", "CONN", "No TLM received yet; marked as disconnected.")

# --- Popup Helper Functions ---
def filter_alert_message(message):
    """
    If the message begins with one of the specified prefixes (WP_, MAN_, MSSN_),
    remove the header (i.e. everything up to and including the first colon)
    and return the remaining text. If no colon is found, simply remove the prefix.
    """
    prefixes = ("STAT_",)
    for prefix in prefixes:
        if message.startswith(prefix):
            parts = message.split(":", 1)
            if len(parts) > 1:
                return parts[1].strip()
            else:
                return message[len(prefix):].strip()
    return None

def display_popup(message):
    """
    Posts the message for window.alert using a server POST request.
    The server is expected to push this alert to the React frontend.
    """
    def popup():
        baseURL = get_local_ip()
        server_endpoint = f"{baseURL}:3000/api/alert"
        try:
            response = requests.post(server_endpoint, json={"message": message})
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Error sending alert: {e}")
    popup_thread = threading.Thread(target=popup)
    popup_thread.start()

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

    # Handle startup message.
    if message == "STARTUP_READY_TO_GO":
        log_message("RECEIVED", "STARTUP", message)
        try:
            interface.sendText("STARTUP_ACKNOWLEDGED", channelIndex=5, wantAck=True)
            with connection_lock:
                is_connected = True
                last_tlm_time = time.time()
            update_status_file(True)
            log_message("SUCCESS", "STARTUP", "Sent STARTUP_ACKNOWLEDGED in response.")
        except Exception as e:
            log_message("FAILED", "STARTUP", f"Error sending STARTUP_ACKNOWLEDGED: {e}")
    # Handle telemetry update.
    elif message.startswith("TLM"):
        clean_message = message.replace("TLM_", "", 1)
        with connection_lock:
            last_tlm_time = time.time()
            is_connected = True
        update_status_file(True)
        log_message("RECEIVED", "TLM", message)
        process_telem_update(clean_message)
    # Handle alert messages (for popups) from WP, MAN, or MSSN.
    elif message.startswith("STAT_"):
        alert_text = filter_alert_message(message)
        if alert_text:
            display_popup(alert_text)
        else:
            log_message("FAILED", "POPUP", f"Could not extract popup text from message: {message}")
    else:
        log_message("FAILED", "UNKNOWN", f"Unrecognized message format: {message}")

# --- Main Listening Loop ---
if __name__ == "__main__":
    print(f"Listening for Meshtastic messages from {SOURCE_ID}...")
    
    # Start the connection monitor thread.
    monitor_thread = threading.Thread(target=connection_monitor, daemon=True)
    monitor_thread.start()

    # Create the TCPInterface and subscribe to the receive channel.
    interface = TCPInterface(hostname="localhost")
    pub.subscribe(handle_message, "meshtastic.receive")
    
    try:
        while True:
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("Shutting down...")
        interface.close()
