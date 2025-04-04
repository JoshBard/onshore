import os
import sys
import csv
from datetime import datetime
import random

# --- Config ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
LOCATION_CSV = os.path.join(SCRIPT_DIR, "../../telemetry_data/live_location.csv")
TELEM_CSV = os.path.join(SCRIPT_DIR, "../../telemetry_data/live_telem.csv")
MAX_ENTRIES = 1000  # Maximum number of data rows (excluding header)

# --- Ensure CSV Files Exist with Headers ---
def ensure_csv(file_path, header):
    if not os.path.isfile(file_path):
        with open(file_path, mode="w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(header)

ensure_csv(LOCATION_CSV, ["timestamp", "lat", "long", "sensor_data"])
ensure_csv(TELEM_CSV, ["timestamp", "telem_update", "sensor_data"])

# --- Function to Trim CSV to the Last MAX_ENTRIES ---
def trim_csv(file_path, max_entries):
    with open(file_path, mode="r", newline="") as f:
        reader = csv.reader(f)
        rows = list(reader)
    # rows[0] is the header; if number of data rows exceeds max_entries, trim them.
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

# Optionally remove the "TELEM_" prefix if present.
if telem_update.startswith("TELEM_"):
    telem_update = telem_update[len("TELEM_"):]

# --- Parse the Telemetry Update for Location Data ---
# Expect telemetry in format: KEY=VALUE|KEY=VALUE|...
parts = telem_update.split("|")
lat = None
lon = None
for part in parts:
    if part.startswith("LAT="):
        try:
            lat = part.split("=")[1]
        except IndexError:
            pass
    elif part.startswith("LON="):
        try:
            lon = part.split("=")[1]
        except IndexError:
            pass

if lat is None or lon is None:
    print("Location data (LAT and LON) not found in telemetry update.")
    sys.exit(1)

# --- Generate Timestamp and Random Sensor Data ---
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
sensor_data_location = random.randint(0, 99)
sensor_data_telem = random.randint(0, 99)

# --- Append Data to Location CSV ---
with open(LOCATION_CSV, mode="a", newline="") as f:
    writer = csv.writer(f)
    writer.writerow([timestamp, lat, lon, sensor_data_location])

# --- Append Data to Telem CSV ---
with open(TELEM_CSV, mode="a", newline="") as f:
    writer = csv.writer(f)
    writer.writerow([timestamp, telem_update, sensor_data_telem])

# --- Trim Both CSV Files to the Last MAX_ENTRIES ---
trim_csv(LOCATION_CSV, MAX_ENTRIES)
trim_csv(TELEM_CSV, MAX_ENTRIES)
