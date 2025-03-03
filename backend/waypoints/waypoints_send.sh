#!/bin/bash

LOG_FILE="manual_logs.log"
DEST_NODE="!eb15a9fe"  # Destination Node ID
PREFIX="WAYPOINTS_"
CHUNK_SIZE=200  # Meshtastic max text message size
CSV_FILE="waypoints.csv"
ENCODED_FILE="encoded_waypoints.txt"
CHUNK_PREFIX="chunk_"

# Check if waypoints.csv exists
if [ ! -f "$CSV_FILE" ]; then
    echo "Error: $CSV_FILE not found!"
    exit 1
fi

echo "Encoding $CSV_FILE to Base64..."
base64 "$CSV_FILE" > "$ENCODED_FILE"

echo "Splitting into chunks of $CHUNK_SIZE bytes..."
split -b "$CHUNK_SIZE" "$ENCODED_FILE" "$CHUNK_PREFIX"

CHUNK_COUNT=0

# Send each chunk over Meshtastic
for file in ${CHUNK_PREFIX}*; do
    CHUNK_CONTENT=$(cat "$file")
    CHUNK_COUNT=$((CHUNK_COUNT+1))
    
    # Format chunk with prefix and numbering
    FORMATTED_MESSAGE="WAYPOINTS_CHUNK_${CHUNK_COUNT}:$CHUNK_CONTENT"

    echo "Sending chunk $CHUNK_COUNT..."
    meshtastic --sendtext "$FORMATTED_MESSAGE" --dest "$DEST_NODE"

    # Log the message
    echo "Sent chunk $CHUNK_COUNT to $DEST_NODE: $FORMATTED_MESSAGE" | tee -a "$LOG_FILE"

    sleep 1  # Wait between chunks to avoid flooding
done

echo "Waypoint CSV sent successfully in $CHUNK_COUNT chunks."
