#!/bin/bash

LOG_FILE="send_logs.log"
DEST_NODE="!eb15a9fe"
CHUNK_SIZE=200
CSV_FILE="waypoints.csv"
ENCODED_FILE="encoded_waypoints.txt"
CHUNK_PREFIX="chunk_"
MESH_FIFO="/tmp/mesh_fifo"

# Ensure the named pipe (FIFO) exists
if [ ! -p "$MESH_FIFO" ]; then
    echo "ERROR: Named pipe $MESH_FIFO not found. Run 'mkfifo /tmp/mesh_fifo' and pipe meshtastic output into it."
    exit 1
fi

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

# Open the FIFO for reading in background
exec 3<"$MESH_FIFO"

echo "Sending $CHUNK_COUNT chunks..."

for file in "${CHUNK_FILES[@]}"; do
    CHUNK_CONTENT=$(cat "$file")
    MSG="WAYPOINTS${CURRENT_CHUNK}:$CHUNK_CONTENT"

    # Send the chunk
    echo "[$(date)] Sending chunk $CURRENT_CHUNK..."
    meshtastic --ch-index 5 --sendtext "$MSG" --dest "$DEST_NODE"
    echo "Sent: $MSG" >> "$LOG_FILE"

    # Wait for the corresponding ACK: "WAYPOINTS_ACK_<CURRENT_CHUNK>"
    ACK="WAYPOINTS_ACK_${CURRENT_CHUNK}"
    echo "Waiting for ACK: $ACK"

    ACK_RECEIVED=0
    TIMEOUT_SECONDS=30
    END_TIME=$(( $(date +%s) + TIMEOUT_SECONDS ))

    while [ $(date +%s) -lt $END_TIME ]; do
        if read -t 2 -u 3 line; then
            if [[ "$line" == *"$ACK"* ]]; then
                echo "ACK for chunk $CURRENT_CHUNK received!"
                ACK_RECEIVED=1
                break
            fi
        fi
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
meshtastic --ch-index 5 --sendtext "$FINISHED_MSG" --dest "$DEST_NODE"
echo "Sent: $FINISHED_MSG" >> "$LOG_FILE"

echo "All chunks sent and ACKed. Finished."
