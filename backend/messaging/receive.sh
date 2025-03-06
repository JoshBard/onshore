#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
LOG_FILE="$SCRIPT_DIR/receive_scripts/receive_messages.log"
SOURCE_ID="0xeb15a9fe"
LAST_IDS_FILE="$SCRIPT_DIR/.last_msg_ids"

log_message() {
    local status="$1"
    local message_type="$2"
    local content="$3"
    echo "$(date '+%Y-%m-%d %H:%M:%S') | TYPE: $message_type | STATUS: $status | MESSAGE: $content" >> "$LOG_FILE"

    tail -n 50 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
}

echo "Listening for Meshtastic messages from $SOURCE_ID... Logging to $LOG_FILE"

# Ensure tracking file exists
touch "$LAST_IDS_FILE"
> "$LAST_IDS_FILE"  # Clear on startup

while true; do
    # Fetch messages and filter by sender
    journalctl -u meshtasticd -o cat --no-pager | grep "Received text msg from=$SOURCE_ID" | while read -r line; do
        # Extract message ID and message content
        MSG_ID=$(echo "$line" | awk -F 'id=' '{print $2}' | awk '{print $1}' | tr -d ',')
        MESSAGE=$(echo "$line" | awk -F 'msg=' '{print $2}')

        # Ensure message is new
        if grep -q "$MSG_ID" "$LAST_IDS_FILE" || [[ -z "$MESSAGE" ]]; then
            continue
        fi

        # Log and store the message ID to avoid duplicate processing
        echo "$MSG_ID" >> "$LAST_IDS_FILE"
        tail -n 50 "$LAST_IDS_FILE" > "$LAST_IDS_FILE.tmp" && mv "$LAST_IDS_FILE.tmp" "$LAST_IDS_FILE"

        # Process location updates
        if [[ "$MESSAGE" == LOC_UPDT_* ]]; then
            CLEAN_MESSAGE="${MESSAGE#LOC_UPDT_}"  # Remove "LOC_UPDT_" prefix
            log_message "RECEIVED" "LOC" "$CLEAN_MESSAGE"
            "$SCRIPT_DIR/receive_scripts/location_receive.sh" "$CLEAN_MESSAGE"
        else
            log_message "FAILED" "UNKNOWN" "Unrecognized message format: $MESSAGE"
        fi
    done

    sleep 2
done
