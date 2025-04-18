#!/bin/bash

# Check if exactly two arguments (SSID and password) are provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <SSID> <password>"
  exit 1
fi

SSID="$1"
PASSWORD="$2"

echo "Switching to network: $SSID"

# Check if the connection already exists
if nmcli connection show "$SSID" &>/dev/null; then
  echo "Connection exists. Activating..."
  nmcli connection up "$SSID"
else
  echo "Creating new connection for SSID: $SSID"
  nmcli device wifi connect "$SSID" password "$PASSWORD"
fi

# Verify the connection status
if [ $? -eq 0 ]; then
  echo "Successfully connected to $SSID"
else
  echo "Failed to connect to $SSID"
fi
