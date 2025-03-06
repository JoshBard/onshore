#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
LOG_FILE="$SCRIPT_DIR/send_scripts/transmit_messages.log"

log_message() {
    local status="$1"
    local message_type="$2"
    local content="$3"
    echo "$(date '+%Y-%m-%d %H:%M:%S') | TYPE: $message_type | STATUS: $status | MESSAGE: $content" >> "$LOG_FILE"

    tail -n 50 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
}

if [ -z "$1" ]; then
    log_message "FAILED" "UNKNOWN" "No message type provided."
    exit 1
fi

MESSAGE_TYPE="$1"

case "$MESSAGE_TYPE" in
    WP)
        "$SCRIPT_DIR/send_scripts/send_waypoints.sh"
        ;;
    MAN)
        "$SCRIPT_DIR/send_scripts/send_manual.sh" "$2"
        ;;
    *)
        log_message "FAILED" "$MESSAGE_TYPE" "Invalid message type."
        exit 1
        ;;
esac
