#!/bin/bash

LOG_FILE="send_logs.log"
CHUNK_SIZE=200
CSV_FILE="waypoints.csv"
ENCODED_FILE="encoded_waypoints.txt"
CHUNK_PREFIX="chunk_"
SOURCE_ID="0xeb767ddf"  # Sender ID of receiver (used to detect ACKs)

# Ensure CSV file exists
if [ ! -f "$CSV_FILE" ]; then
    echo "Error: $CSV_FILE not found!"
    exit 1
fi

# Remove header, compress, encode
tail -n +2 "$CSV_FILE" | gzip -c | base64 > "$ENCODED_FILE"

# Split into fixed-size chunks
rm -f ${CHUNK_PREFIX}*
split -b "$CHUNK_SIZE" "$ENCODED_FILE" "$CHUNK_PREFIX"

CHUNK_FILES=( ${CHUNK_PREFIX}* )
CHUNK_COUNT=${#CHUNK_FILES[@]}
CURRENT_CHUNK=1

echo "Sending $CHUNK_COUNT chunks..."

for file in "${CHUNK_FILES[@]}"; do
    CHUNK_CONTENT=$(cat "$file")
    MSG="WAYPOINTS${CURRENT_CHUNK}:$CHUNK_CONTENT"

    # Send the chunk (broadcast to all nodes)
    echo "[$(date)] Sending chunk $CURRENT_CHUNK..."
    meshtastic --ch-index 5 --sendtext "$MSG"
    echo "Sent: $MSG" >> "$LOG_FILE"

    # Wait for the corresponding ACK in `journalctl`
    ACK="WAYPOINTS_ACK_${CURRENT_CHUNK}"
    echo "Waiting for ACK: $ACK"

    ACK_RECEIVED=0
    TIMEOUT_SECONDS=180  # ⏳ Increased timeout to 3 minutes (180 seconds)
    END_TIME=$(( $(date +%s) + TIMEOUT_SECONDS ))

    while [ $(date +%s) -lt $END_TIME ]; do
        # Check the latest logs for an ACK from any node
        if journalctl -u meshtasticd -o cat --no-pager --since "5 seconds ago" | grep "Received text msg" | grep -q "$ACK"; then
            echo "ACK for chunk $CURRENT_CHUNK received!"
            ACK_RECEIVED=1
            break
        fi

        sleep 5  # Slow polling to reduce log reads (every 5 seconds)
    done

    if [ $ACK_RECEIVED -eq 0 ]; then
        echo "Timeout waiting for $ACK. Exiting."
        exit 1
    fi

    CURRENT_CHUNK=$((CURRENT_CHUNK+1))
done

# Send "WAYPOINTS_FINISHED"
FINISHED_MSG="WAYPOINTS_FINISHED"
echo "[$(date)] Sending FINISHED signal..."
meshtastic --ch-index 5 --sendtext "$FINISHED_MSG"
echo "Sent: $FINISHED_MSG" >> "$LOG_FILE"

echo "All chunks sent and ACKed. Finished."
