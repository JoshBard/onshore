import os
import sys
import csv
from datetime import datetime
import random

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
# Define paths for CSV files
LOCATION_CSV = os.path.join(SCRIPT_DIR, "../../telemetry_data/live_location.csv")
TELEM_CSV = os.path.join(SCRIPT_DIR, "../../telemetry_data/live_telem.csv")
MAX_ENTRIES = 1000  # Maximum number of data rows (excluding header)

# Ensure the directory for CSV files exists
location_dir = os.path.dirname(LOCATION_CSV)
os.makedirs(location_dir, exist_ok=True)

# --- Ensure CSV Files Exist with Headers ---
def ensure_csv(file_path, header):
    if not os.path.isfile(file_path):
        with open(file_path, mode="w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(header)

# live_location.csv now only contains timestamp, lat, and long (no sensor_data)
ensure_csv(LOCATION_CSV, ["timestamp", "lat", "long"])

# live_telem.csv will have each telemetry value in its own column plus a sensor_data column.
# Expected telemetry keys: BATT, CUR, LVL, GPS_FIX, GPS_SATS, LAT, LON, ALT, MODE
ensure_csv(TELEM_CSV, ["timestamp", "BATT", "CUR", "LVL", "GPS_FIX", "GPS_SATS", "LAT", "LON", "ALT", "MODE", "sensor_data"])

# --- Function to Trim CSV to the Last MAX_ENTRIES ---
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

# --- Get Input Telemetry Update ---
if len(sys.argv) < 2:
    sys.exit(1)

telem_update = sys.argv[1]

# Remove "TELEM_" prefix if present.
if telem_update.startswith("TELEM_"):
    telem_update = telem_update[len("TELEM_"):]

# --- Parse the Telemetry Update ---
# Expected format: KEY=VALUE|KEY=VALUE|...
fields = telem_update.split("|")
telem_data = {}
for field in fields:
    if "=" in field:
        key, value = field.split("=", 1)
        telem_data[key.strip()] = value.strip()

# Expected telemetry keys for telem CSV
expected_keys = ["BATT", "CUR", "LVL", "GPS_FIX", "GPS_SATS", "LAT", "LON", "ALT", "MODE"]
# Fill in any missing keys with an empty string
for key in expected_keys:
    if key not in telem_data:
        telem_data[key] = ""

# For live_location.csv, ensure we have latitude and longitude.
if telem_data["LAT"] == "" or telem_data["LON"] == "":
    print("Location data (LAT and LON) not found in telemetry update.")
    sys.exit(1)

# --- Generate Timestamp and Random Sensor Data ---
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
sensor_data_telem = random.randint(0, 99)

# --- Append Data to live_location.csv (only timestamp, lat, long) ---
with open(LOCATION_CSV, mode="a", newline="") as f:
    writer = csv.writer(f)
    writer.writerow([timestamp, telem_data["LAT"], telem_data["LON"]])

# --- Append Data to live_telem.csv (all telemetry fields + sensor_data) ---
with open(TELEM_CSV, mode="a", newline="") as f:
    writer = csv.writer(f)
    row = [timestamp] + [telem_data[key] for key in expected_keys] + [sensor_data_telem]
    writer.writerow(row)

# --- Trim Both CSV Files to the Last MAX_ENTRIES ---
trim_csv(LOCATION_CSV, MAX_ENTRIES)
trim_csv(TELEM_CSV, MAX_ENTRIES)
