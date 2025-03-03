#!/bin/bash

LOG_FILE="manual_logs.log"
DEST_NODE="!eb15a9fe"  # Destination Node ID
PREFIX="MANUAL_COMMAND_"

if [ -z "$1" ]; then
    echo "No command provided"
    exit 1
fi

FINAL_MESSAGE="${PREFIX}$1"

# Send the message with destination
meshtastic --sendtext "$FINAL_MESSAGE" --dest "$DEST_NODE"

# Log the message
echo "Sent via Meshtastic to $DEST_NODE: $FINAL_MESSAGE" | tee -a "$LOG_FILE"