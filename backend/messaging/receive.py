#!/usr/bin/env python3
import os
import sys
import csv
from datetime import datetime
import random
import queue
import threading

# Import logger from your receive scripts folder.
from receive_logger import log_message

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
# Define the absolute path for the telemetry CSV file.
TELEM_CSV = os.path.join(SCRIPT_DIR, "../telemetry_data/live_telem.csv")
MAX_ENTRIES = 1000  # Maximum number of data rows (excluding header)

# Ensure the directory for the CSV file exists.
telem_dir = os.path.dirname(TELEM_CSV)
os.makedirs(telem_dir, exist_ok=True)

# --- Function: Ensure CSV Exists with Headers ---
def ensure_csv(file_path, header):
    if not os.path.isfile(file_path):
        with open(file_path, mode="w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(header)
        log_message("INFO", "TELEM", f"CSV created with header at {file_path}")

# live_telem.csv will have each telemetry value in its own column, plus a sensor_data column.
# Expected telemetry keys: BATT, CUR, LVL, GPS_FIX, GPS_SATS, LAT, LON, ALT, MODE
HEADER = ["timestamp", "BATT", "CUR", "LVL", "GPS_FIX", "GPS_SATS", "LAT", "LON", "ALT", "MODE", "sensor_data"]
ensure_csv(TELEM_CSV, HEADER)

# --- Function: Trim CSV to the Last MAX_ENTRIES ---
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
    log_message("INFO", "TELEM", f"CSV trimmed to last {max_entries} entries.")

# --- Function: Process a Telemetry Update ---
def process_telem_update(telem_update):
    """
    Processes a telemetry update string and appends the parsed data to the CSV.
    Expected format: KEY=VALUE|KEY=VALUE|...
    """
    # Remove "TELEM_" prefix if present.
    if telem_update.startswith("TELEM_"):
        telem_update = telem_update[len("TELEM_"):]
    
    # Parse the telemetry update.
    fields = telem_update.split("|")
    telem_data = {}
    for field in fields:
        if "=" in field:
            key, value = field.split("=", 1)
            telem_data[key.strip()] = value.strip()
    
    # Expected telemetry keys.
    expected_keys = ["BATT", "CUR", "LVL", "GPS_FIX", "GPS_SATS", "LAT", "LON", "ALT", "MODE"]
    # Fill in any missing keys with an empty string.
    for key in expected_keys:
        if key not in telem_data:
            telem_data[key] = ""
    
    # Check that latitude and longitude are present.
    if telem_data["LAT"] == "" or telem_data["LON"] == "":
        log_message("FAILED", "TELEM", "Location data (LAT and LON) not found in telemetry update.")
        return
    
    # Generate the timestamp and random sensor data.
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sensor_data_telem = random.randint(0, 99)
    
    # Construct the row in the order: timestamp, expected keys, then sensor_data.
    row = [timestamp] + [telem_data[key] for key in expected_keys] + [sensor_data_telem]
    
    # Append the new row to the CSV.
    try:
        with open(TELEM_CSV, mode="a", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(row)
        log_message("SUCCESS", "TELEM", f"Appended telemetry data at {timestamp}")
    except Exception as e:
        log_message("FAILED", "TELEM", f"Error appending telemetry data: {e}")
    
    # Trim the CSV file if needed.
    trim_csv(TELEM_CSV, MAX_ENTRIES)

# --- Worker Thread for Telemetry Updates ---
def telem_worker(q):
    while True:
        update = q.get()
        if update is None:  # Shutdown signal.
            break
        process_telem_update(update)
        q.task_done()

# --- Main ---
def main():
    # This script expects one telemetry update as a command-line argument.
    if len(sys.argv) < 2:
        log_message("FAILED", "TELEM", "No telemetry update provided.")
        sys.exit(1)
    
    telem_update = sys.argv[1]
    
    # Create a thread-safe queue for telemetry updates.
    telem_queue = queue.Queue()
    # Start the worker thread.
    worker_thread = threading.Thread(target=telem_worker, args=(telem_queue,), daemon=True)
    worker_thread.start()
    
    # Enqueue the telemetry update.
    telem_queue.put(telem_update)
    # Wait until the queue is fully processed.
    telem_queue.join()
    
    # Signal the worker thread to exit.
    telem_queue.put(None)
    worker_thread.join()

if __name__ == "__main__":
    main()
