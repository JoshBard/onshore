#!/bin/bash

# Define a unique private channel key (must be the same for both radios)
PRIVATE_CHANNEL_KEY="WAVES2025"

# Define a channel name
CHANNEL_NAME="WAVESchannel"

echo "Configuring Meshtastic Radios for Direct Communication..."

# 1. Apply Private Channel
meshtastic --ch-set psk "$PRIVATE_CHANNEL_KEY"
meshtastic --ch-set name "$CHANNEL_NAME"

# 2. Disable Mesh Networking Features
meshtastic --set rebroadcast_mode DISABLED
meshtastic --set hop_limit 1
meshtastic --set store_forward.enabled false
meshtastic --set send_ack true

# 3. Disable GPS Position Broadcasting
meshtastic --set position_broadcast_secs 0

# 4. Set Transmission Power to Maximum for Best Performance
meshtastic --set txpower 30

# 5. Enable acknowledgements
meshtastic --set send_ack true
