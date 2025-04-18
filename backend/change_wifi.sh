#!/usr/bin/env bash
#
# wifi-switch.sh
# Usage: sudo ./wifi-switch.sh <SSID> <PASSWORD>

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Must run as root: sudo $0 <SSID> <PASSWORD>"
  exit 1
fi

if [ $# -ne 2 ]; then
  echo "Usage: sudo $0 <SSID> <PASSWORD>"
  exit 1
fi

SSID="$1"
PSK="$2"

# 1) Write the client config for wlan0
WPA_CONF="/etc/wpa_supplicant/wpa_supplicant-wlan0.conf"
mkdir -p "$(dirname "$WPA_CONF")"
cat > "$WPA_CONF" <<EOF
country=US
ctrl_interface=DIR=/run/wpa_supplicant GROUP=netdev
update_config=1

network={
    ssid="$SSID"
    psk="$PSK"
    key_mgmt=WPA-PSK
}
EOF
chmod 600 "$WPA_CONF"
echo "→ Wrote client config: $WPA_CONF"

# 2) Stop any AP‑mode service so wlan0 is free
echo "→ Stopping AP mode (wpa_supplicant@ap0, hostapd, dnsmasq)…"
systemctl stop wpa_supplicant@ap0.service 2>/dev/null || true
systemctl stop hostapd                        2>/dev/null || true
systemctl stop dnsmasq                        2>/dev/null || true

# 3) Restart wpa_supplicant for wlan0
echo "→ Restarting wpa_supplicant@wlan0.service…"
# note: assumes you have systemd unit wpa_supplicant@wlan0.service enabled previously
systemctl restart wpa_supplicant@wlan0.service

# 4) Let systemd‑networkd pick up the new DHCP on wlan0
echo "→ Restarting systemd-networkd…"
systemctl restart systemd-networkd.service

# 5) Optional: wait a bit and show the new IP
sleep 2
IP=$(networkctl status wlan0 | awk '/Address: /{print $2; exit}')
echo "wlan0 is now on SSID '$SSID' with IP $IP"