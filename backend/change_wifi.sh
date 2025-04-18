#!/usr/bin/env bash
#
# wifi-switch.sh
# Usage: sudo ./wifi-switch.sh <SSID> <PASSWORD>

set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0 <SSID> <PASSWORD>"
  exit 1
fi

if [ $# -ne 2 ]; then
  echo "Usage: sudo $0 <SSID> <PASSWORD>"
  exit 1
fi

SSID="$1"
PSK="$2"
WPA_CONF="/etc/wpa_supplicant/wpa_supplicant.conf"

# Backup existing Wi‑Fi config
cp "$WPA_CONF" "${WPA_CONF}.bak.$(date +%Y%m%d%H%M%S)"

# Overwrite wpa_supplicant.conf
cat > "$WPA_CONF" <<EOF
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="$SSID"
    psk="$PSK"
    key_mgmt=WPA-PSK
    priority=0
}
EOF

# Apply changes
wpa_cli -i wlan0 reconfigure
systemctl restart dhcpcd

echo "Switched Wi‑Fi to '$SSID'"

# Determine the Pi's new IP on wlan0 (first address)
IP=$(hostname -I | awk '{print $1}')
if [ -z "$IP" ]; then
  echo "Warning: could not determine wlan0 IP; skipping .env updates"
  exit 0
fi

# List of .env files to update
ENV_FILES=(
  "$PWD/.env"
  "$PWD/../frontend/.env"
)

for ENV_FILE in "${ENV_FILES[@]}"; do
  if [ -f "$ENV_FILE" ]; then
    echo "Updating $ENV_FILE → REACT_APP_ROUTER=http://$IP"
    # backup .env
    cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"
    # replace or append
    if grep -q '^REACT_APP_ROUTER=' "$ENV_FILE"; then
      sed -i -E "s|^REACT_APP_ROUTER=.*$|REACT_APP_ROUTER=http://$IP|" "$ENV_FILE"
    else
      echo "REACT_APP_ROUTER=http://$IP" >> "$ENV_FILE"
    fi
  else
    echo "No .env at $ENV_FILE; skipping"
  fi
done
