#!/bin/bash

# Define a unique private channel key (must be the same for both radios)
PRIVATE_CHANNEL_KEY="0x223addd2157262ef8273d40c1c986e1f053905eaadf05379da3d6b4583d3a77e"
CHANNEL_NAME="WAVESchannel"
CHANNEL_INDEX=5  # Default primary channel index

echo "Configuring Meshtastic Radios for Direct Communication..."

# 1. Apply Private Channel (Ensuring byte format for PSK)
# meshtastic --ch-set name "$CHANNEL_NAME" --ch-index "$CHANNEL_INDEX" --host localhost
meshtastic --ch-set psk $PRIVATE_CHANNEL_KEY --ch-index "$CHANNEL_INDEX" --host localhost

# 2. Disable Mesh Networking Features (Fixed Attribute Name)
meshtastic --set device.rebroadcast_mode NONE --host localhost
meshtastic --set lora.hop_limit 1 --host localhost
meshtastic --set store_forward.enabled false --host localhost

# 3. Disable GPS Position Broadcasting (Ensure Correct Attribute Path)
meshtastic --set position.position_broadcast_secs 0 --host localhost

# 4. Set Transmission Power to Maximum (Fixed attribute path)
meshtastic --set lora.tx_power 30 --host localhost

echo "Configuration completed successfully."