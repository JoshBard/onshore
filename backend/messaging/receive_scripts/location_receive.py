import os
import sys
import csv
from datetime import datetime
import random

# --- Setup ---
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
CSV_FILE = os.path.join(SCRIPT_DIR, "../../location_data/live_location.csv")

# Ensure the CSV file exists and has a header
if not os.path.isfile(CSV_FILE):
    with open(CSV_FILE, mode="w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "lat", "long", "sensor_data"])

# --- Get input data ---
if len(sys.argv) < 2:
    sys.exit(1)

location_data = sys.argv[1]

try:
    lat, long = location_data.split("_")
except ValueError:
    print("Invalid input format. Expected 'lat_long'")
    sys.exit(1)

# Generate timestamp
timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# Generate fake sensor data (you can modify this)
sensor_data = random.randint(0, 99)

# Append to CSV
with open(CSV_FILE, mode="a", newline="") as f:
    writer = csv.writer(f)
    writer.writerow([timestamp, lat, long, sensor_data])
