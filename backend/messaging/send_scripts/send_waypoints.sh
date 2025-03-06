#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
LOG_FILE="$SCRIPT_DIR/transmit_messages.log"
CHUNK_SIZE=222
CSV_FILE="$SCRIPT_DIR/../../waypoints/waypoints.csv"
ENCODED_FILE="$SCRIPT_DIR/encoded_waypoints.txt"
CHUNK_PREFIX="chunk_"
CHANNEL_INDEX=5

log_message() {
    local status="$1"
    local message="$2"
    echo "$(date '+%Y-%m-%d %H:%M:%S') | TYPE: WP | STATUS: $status | MESSAGE: $message" >> "$LOG_FILE"
}

if [ ! -f "$CSV_FILE" ]; then
    log_message "FAILED" "CSV file not found!"
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

for file in "${CHUNK_FILES[@]}"; do
    CHUNK_CONTENT=$(cat "$file")
    MSG="WP_${CURRENT_CHUNK}:$CHUNK_CONTENT"
    
    meshtastic --ch-index "$CHANNEL_INDEX" --sendtext "$MSG"
    if [ $? -eq 0 ]; then
        log_message "SUCCESS" "Chunk $CURRENT_CHUNK sent"
    else
        log_message "FAILED" "Chunk $CURRENT_CHUNK failed to send"
        exit 1
    fi

    CURRENT_CHUNK=$((CURRENT_CHUNK+1))
done

# Send completion message
meshtastic --ch-index "$CHANNEL_INDEX" --sendtext "WP_FINISHED"
log_message "SUCCESS" "All waypoints sent"

# Cleanup temporary files
rm -f "$ENCODED_FILE" ${CHUNK_PREFIX}*