#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
LOG_FILE="$SCRIPT_DIR/transmit_messages.log"
LAST_MANUAL_FILE="$SCRIPT_DIR/last_manual_message.log"
CHANNEL_INDEX=5

if [ -z "$1" ]; then
    echo "Error: No manual message provided." >> "$LOG_FILE"
    exit 1
fi

MESSAGE_CONTENT="$1"
FINAL_MESSAGE="MAN_${MESSAGE_CONTENT}"

log_message() {
    local status="$1"
    local message="$2"
    echo "$(date '+%Y-%m-%d %H:%M:%S') | TYPE: MAN | STATUS: $status | MESSAGE: $message" >> "$LOG_FILE"
}

# Check for duplicate message
if [ -f "$LAST_MANUAL_FILE" ] && grep -Fxq "$FINAL_MESSAGE" "$LAST_MANUAL_FILE"; then
    log_message "SKIPPED" "Duplicate message: $FINAL_MESSAGE"
    exit 0
fi

# Send message
meshtastic --ch-index "$CHANNEL_INDEX" --sendtext "$FINAL_MESSAGE"
if [ $? -eq 0 ]; then
    log_message "SUCCESS" "$FINAL_MESSAGE"
    echo "$FINAL_MESSAGE" > "$LAST_MANUAL_FILE"
else
    log_message "FAILED" "$FINAL_MESSAGE"
fi
