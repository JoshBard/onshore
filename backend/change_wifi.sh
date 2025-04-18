#!/usr/bin/env bash
#
# wifi-switch.sh
# Usage: sudo ./wifi-switch.sh <SSID> <PASSWORD>

set -euo pipefail

# 1) Ensure root
if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0 <SSID> <PASSWORD>" >&2
  exit 1
fi

# 2) Check args
if [ $# -ne 2 ]; then
  echo "Usage: sudo $0 <SSID> <PASSWORD>" >&2
  exit 1
fi

SSID="$1"
PSK="$2"
WPA_DIR="/etc/wpa_supplicant"
WPA_CONF="$WPA_DIR/wpa_supplicant.conf"

# 3) Ensure config directory & file
mkdir -p "$WPA_DIR"
touch "$WPA_CONF"
chmod 600 "$WPA_CONF"
echo "Using wpa_supplicant config: $WPA_CONF"

# 4) Backup existing config
cp "$WPA_CONF" "${WPA_CONF}.bak.$(date +%Y%m%d%H%M%S)"
echo "Backed up old config"

# 5) Write new network block
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

# 6) Stop hotspot services if running
echo "Stopping hotspot services (hostapd, dnsmasq) if present..."
systemctl stop hostapd 2>/dev/null || true
systemctl stop dnsmasq 2>/dev/null || true

# 7) Try to reconfigure wpa_supplicant
echo "Attempting wpa_cli reconfigure..."
if wpa_cli -i wlan0 reconfigure; then
  echo "wpa_cli reconfigure succeeded"
else
  echo "wpa_cli reconfigure failed → restarting wpa_supplicant service"
  # 7a) systemd-managed service
  if systemctl list-units --full -all | grep -q 'wpa_supplicant@wlan0.service'; then
    systemctl restart wpa_supplicant@wlan0.service
  # 7b) generic wpa_supplicant service
  elif systemctl list-units --full -all | grep -q 'wpa_supplicant.service'; then
    systemctl restart wpa_supplicant.service
  else
    # 7c) fallback: launch wpa_supplicant directly
    echo "Starting wpa_supplicant manually"
    pkill wpa_supplicant 2>/dev/null || true
    wpa_supplicant -B -i wlan0 -c "$WPA_CONF"
  fi
fi

# 8) Renew DHCP lease or cycle interface
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

echo "Wi‑Fi switched to '$SSID' successfully."
