#!/bin/bash
#
# add-wifi.sh — append a new network to wpa_supplicant.conf and switch to it
# Usage: sudo ./add-wifi.sh <SSID> <PASSWORD>

set -euo pipefail

# ——— 1) sanity checks ————————————————————————————————————
if [ "$(id -u)" -ne 0 ]; then
  echo "Error: must run as root" >&2
  exit 1
fi
if [ $# -ne 2 ]; then
  echo "Usage: sudo $0 <SSID> <PASSWORD>" >&2
  exit 1
fi

SSID="$1"
PSK="$2"
CONF="/etc/wpa_supplicant/wpa_supplicant.conf"

# ——— 2) backup current config ——————————————————————————
cp "$CONF" "$CONF.bak.$(date +%Y%m%d%H%M%S)"

# ——— 3) append new network ————————————————————————————
# uses wpa_passphrase to generate a hashed PSK entry
{
  echo ""
  echo "# added on $(date): $SSID"
  wpa_passphrase "$SSID" "$PSK"
} >> "$CONF"

chmod 600 "$CONF"

# ——— 4) reconfigure & bring up interface ————————————————————
echo "Reconfiguring wpa_supplicant…"
wpa_cli -i wlan0 reconfigure

echo "Ensuring wlan0 is up…"
rfkill unblock wifi || true
ip link set wlan0 up

echo "Restarting DHCP client…"
systemctl restart dhcpcd.service

# ——— 5) status check ————————————————————————————————
echo
echo "Current wlan0 status:"
ip addr show wlan0 | grep -E 'inet |state'
