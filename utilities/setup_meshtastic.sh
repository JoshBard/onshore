#!/bin/bash

# Define a unique private channel key (must be the same for both radios)
PRIVATE_CHANNEL_KEY="WAVES2025"
CHANNEL_NAME="WAVESchannel"
CHANNEL_INDEX=0  # Default primary channel index

echo "Configuring Meshtastic Radios for Direct Communication..."

# 1. Apply Private Channel (needs --ch-index)
meshtastic --ch-set psk "$PRIVATE_CHANNEL_KEY" --ch-index $CHANNEL_INDEX
meshtastic --ch-set name "$CHANNEL_NAME" --ch-index $CHANNEL_INDEX

# 2. Disable Mesh Networking Features (Updated Attributes)
meshtastic --set device.rebroadcast_mode DISABLED
meshtastic --set lora.hop_limit 1
meshtastic --set store_forward.enabled false

# 3. Disable GPS Position Broadcasting
meshtastic --set position.position_broadcast_secs 0

# 4. Set Transmission Power to Maximum
meshtastic --set lora.tx_power 30

# 5. Enable acknowledgments (Corrected Attribute)
meshtastic --set security.send_ack_enabled true

echo "Configuration completed successfully."