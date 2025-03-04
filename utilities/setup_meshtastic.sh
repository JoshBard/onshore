#!/bin/bash

# Define a unique private channel key (must be the same for both radios)
PRIVATE_CHANNEL_KEY="SIxCfBPJOgEx42/zjYsLIw=="
CHANNEL_NAME="WAVESchannel"
CHANNEL_INDEX=0  # Default primary channel index

echo "Configuring Meshtastic Radios for Direct Communication..."

# 1. Apply Private Channel (Fixed ch-index issue)
meshtastic --ch-set psk "$(echo "$PRIVATE_CHANNEL_KEY" | base64 --decode)" --ch-index "$CHANNEL_INDEX" --host localhost
meshtastic --ch-set name "$CHANNEL_NAME" --ch-index "$CHANNEL_INDEX" --host localhost

# 2. Disable Mesh Networking Features (Fixed Attribute Name)
meshtastic --set device.rebroadcast_mode NONE --host localhost
meshtastic --set lora.hop_limit 1 --host localhost
meshtastic --set store_forward.enabled false --host localhost

# 3. Disable GPS Position Broadcasting (Ensure Correct Attribute Path)
meshtastic --set position.position_broadcast_secs 0 --host localhost

# 4. Set Transmission Power to Maximum (Fixed attribute path)
meshtastic --set lora.tx_power 30 --host localhost

echo "Configuration completed successfully."
