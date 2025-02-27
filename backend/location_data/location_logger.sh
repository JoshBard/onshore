#!/bin/bash

CSV_FILE="live_location.csv"
SOURCE_ID="0xeb15a9fe"
LAST_IDS_FILE=".last_msg_ids"

echo "Listening for LOCATION_UPDATE_ messages from $SOURCE_ID... Logging to $CSV_FILE"

# Ensure the last message IDs file exists
touch "$LAST_IDS_FILE"

# Ensure the CSV file exists and has a header
if [ ! -f "$CSV_FILE" ]; then
    echo "timestamp,lat,long,sensor_data" > "$CSV_FILE"
fi

# Clear last message IDs file on boot
> "$LAST_IDS_FILE"

while true; do
    # Get the last 10 messages and filter for the correct sender
    journalctl -u meshtasticd -n 10 -o cat --no-pager | grep "Received text msg from=$SOURCE_ID" | while read -r line; do
        # Extract message ID and message content
        MSG_ID=$(echo "$line" | awk -F 'id=' '{print $2}' | awk '{print $1}' | tr -d ',')
        MESSAGE=$(echo "$line" | awk -F 'msg=' '{print $2}')

        # Check if the message starts with "LOCATION_UPDATE_"
        if [[ "$MESSAGE" == LOCATION_UPDATE_* ]]; then
            # Extract lat and long
            LOCATION_DATA=${MESSAGE#LOCATION_UPDATE_}  # Remove prefix
            LAT=$(echo "$LOCATION_DATA" | awk -F '_' '{print $1}')
            LONG=$(echo "$LOCATION_DATA" | awk -F '_' '{print $2}')

            # Generate timestamp
            TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

            # Check if this message ID has already been processed
            if ! grep -q "$MSG_ID" "$LAST_IDS_FILE" && [[ -n "$LAT" && -n "$LONG" ]]; then
                # Generate sensor data (random number for now, modify as needed)
                SENSOR_DATA=$((RANDOM % 100))

                # Append to CSV file
                echo "$TIMESTAMP,$LAT,$LONG,$SENSOR_DATA" >> "$CSV_FILE"

                # Store the message ID to prevent duplicates
                echo "$MSG_ID" >> "$LAST_IDS_FILE"

                # Prune .last_msg_ids to keep only the last 100 entries
                tail -n 100 "$LAST_IDS_FILE" > "$LAST_IDS_FILE.tmp" && mv "$LAST_IDS_FILE.tmp" "$LAST_IDS_FILE"
            fi
        fi
    done

    # Optional delay to avoid excessive polling
    sleep 2
done
