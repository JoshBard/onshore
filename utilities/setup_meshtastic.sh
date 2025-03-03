#!/bin/bash

# Define a unique private channel key (must be the same for both radios)
PRIVATE_CHANNEL_KEY="WAVES2025"  # Change this to your own

# Define a channel name
CHANNEL_NAME="WAVESchannel"

echo "Configuring Meshtastic Radios for Direct Communication..."

# 1. Apply Private Channel (Ensure Both Radios Use Same PSK)
meshtastic --ch-set psk "$PRIVATE_CHANNEL_KEY"
meshtastic --ch-set name "$CHANNEL_NAME"

# 2. Disable Mesh Networking Features (Only Direct Peer-to-Peer)
meshtastic --set rebroadcast_mode DISABLED
meshtastic --set hop_limit 1
meshtastic --set store_forward.enabled false

# 3. Disable GPS Position Broadcasting (Unnecessary for Direct Comms)
meshtastic --set position_broadcast_secs 0

# 4. Set Transmission Power to Maximum for Best Performance
meshtastic --set txpower 30
