#!/bin/bash

# Check if a message argument was provided
if [ -z "$1" ]; then
    echo "No command provided"
    exit 1
fi

# Send the message using the Meshtastic CLI
meshtastic --sendtext "$1"

# Print confirmation
echo "Sent via Meshtastic: $1"
