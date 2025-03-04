#!/bin/bash

LOG_FILE="manual_logs.log"
PREFIX="MANUAL_COMMAND_"

if [ -z "$1" ]; then
    echo "No command provided"
    exit 1
fi

FINAL_MESSAGE="${PREFIX}$1"

# Send the message as a broadcast (no --dest)
meshtastic --sendtext "$FINAL_MESSAGE"

# Log the message
echo "Broadcasted via Meshtastic: $FINAL_MESSAGE" | tee -a "$LOG_FILE"