#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
LOG_FILE="$SCRIPT_DIR/transmit_messages.log"
CHANNEL_INDEX=5

if [ -z "$1" ]; then
    echo "Error: No mission message provided." >> "$LOG_FILE"
    exit 1
fi

# Convert input to corresponding message
case "$1" in
    "START")
        MESSAGE_CONTENT="MSSN_START"
        ;;
    "STOP")
        MESSAGE_CONTENT="MSSN_STOP"
        ;;
    *)
        echo "Error: Invalid message input." >> "$LOG_FILE"
        exit 1
        ;;
esac

FINAL_MESSAGE="$MESSAGE_CONTENT"

log_message() {
    local status="$1"
    local message="$2"
    echo "$(date '+%Y-%m-%d %H:%M:%S') | TYPE: MSSN | STATUS: $status | MESSAGE: $message" >> "$LOG_FILE"
}

# Send message
meshtastic --ch-index "$CHANNEL_INDEX" --sendtext "$FINAL_MESSAGE"
if [ $? -eq 0 ]; then
    log_message "SUCCESS" "$FINAL_MESSAGE"
else
    log_message "FAILED" "$FINAL_MESSAGE"
fi
