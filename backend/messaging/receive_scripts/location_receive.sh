#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
CSV_FILE="$SCRIPT_DIR/../../location_data/live_location.csv"

# Ensure the CSV file exists and has a header
if [ ! -f "$CSV_FILE" ]; then
    echo "timestamp,lat,long,sensor_data" > "$CSV_FILE"
fi

LOCATION_DATA="$1"

if [[ -z "$LOCATION_DATA" ]]; then
    exit 1
fi

# Extract latitude and longitude
LAT=$(echo "$LOCATION_DATA" | awk -F '_' '{print $1}')
LONG=$(echo "$LOCATION_DATA" | awk -F '_' '{print $2}')

# Generate timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Generate sensor data (random for now, modify if needed)
SENSOR_DATA=$((RANDOM % 100))

# Append to CSV file
echo "$TIMESTAMP,$LAT,$LONG,$SENSOR_DATA" >> "$CSV_FILE"
