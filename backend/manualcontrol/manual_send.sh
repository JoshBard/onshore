#!/bin/bash

# Check if a message argument was provided
if [ -z "$1" ]; then
    echo "No command provided"
    exit 1
fi

# Define the message prefix
PREFIX="MANUAL_COMMAND_"

# Construct the final message
FINAL_MESSAGE="${PREFIX}$1"

# Send the message using the Meshtastic CLI
meshtastic --sendpacket "$FINAL_MESSAGE"

# Print confirmation
echo "Sent via Meshtastic: $FINAL_MESSAGE"
