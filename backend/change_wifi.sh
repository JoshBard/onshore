#!/usr/bin/env bash
#
# wifi-switch.sh
# Usage: sudo ./wifi-switch.sh <SSID> <PASSWORD>

set -e

# 1) ensure running as root
if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0 <SSID> <PASSWORD>"
  exit 1
fi

# 2) check args
if [ $# -ne 2 ]; then
  echo "Usage: sudo $0 <SSID> <PASSWORD>"
  exit 1
fi

SSID="$1"
PSK="$2"
WPA_DIR="/etc/wpa_supplicant"
WPA_CONF="$WPA_DIR/wpa_supplicant.conf"

# 3) ensure wpa_supplicant directory exists
if [ ! -d "$WPA_DIR" ]; then
  mkdir -p "$WPA_DIR"
fi

# 4) ensure config file exists (touch again just before editing)
if [ ! -f "$WPA_CONF" ]; then
  touch "$WPA_CONF"
  chmod 600 "$WPA_CONF"
fi

echo "Using wpa_supplicant config: $WPA_CONF"

# 5) backup existing config
cp "$WPA_CONF" "${WPA_CONF}.bak.$(date +%Y%m%d%H%M%S)"
echo "Backed up old config to ${WPA_CONF}.bak.*"

# 6) re‑ensure the file is present before we overwrite it
touch "$WPA_CONF"
chmod 600 "$WPA_CONF"

# 7) write new network block
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
echo "Wrote new network block for SSID '$SSID'"

# 8) stop hotspot services if running
echo "Stopping hotspot services (hostapd, dnsmasq) if present..."
systemctl stop hostapd    2>/dev/null || true
systemctl stop dnsmasq    2>/dev/null || true

# 9) reload wpa_supplicant
echo "Reconfiguring wpa_supplicant on wlan0..."
wpa_cli -i wlan0 reconfigure || echo "wpa_cli reconfigure failed, proceeding anyway"

# 10) renew DHCP lease or cycle interface
echo "Bringing up DHCP on wlan0..."
if command -v dhcpcd >/dev/null 2>&1; then
  dhcpcd wlan0
elif command -v dhclient >/dev/null 2>&1; then
  dhclient -r wlan0 || true
  dhclient wlan0
else
  echo "No DHCP client found—cycling wlan0 link"
  ip link set wlan0 down
  sleep 1
  ip link set wlan0 up
fi

echo "Wi‑Fi switch to '$SSID' complete."