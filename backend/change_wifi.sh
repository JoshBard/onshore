#!/bin/bash
#
# switch-to-client.sh — switch from AP mode back to Wi‑Fi client
# Usage: sudo ./switch-to-client.sh <SSID> <PASSWORD>

set -e

# 1) must run as root
if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo $0 <SSID> <PASSWORD>"
  exit 1
fi

# 2) check args
if [ $# -ne 2 ]; then
  echo "Usage: sudo $0 <SSID> <PASSWORD>"
  exit 1
fi

SSID="$1"
PSK="$2"

echo "Stopping AP services…"
systemctl stop hostapd dnsmasq

echo "Disabling AP on boot…"
systemctl disable hostapd dnsmasq

echo "Re‑enabling DHCP client (dhcpcd)…"
systemctl unmask dhcpcd.service
systemctl enable dhcpcd.service
systemctl restart dhcpcd.service

echo "Writing /etc/wpa_supplicant/wpa_supplicant.conf…"
cat > /etc/wpa_supplicant/wpa_supplicant.conf <<EOF
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=US

network={
    ssid="$SSID"
    psk="$PSK"
}
EOF

echo "Bringing up wlan0…"
ip link set wlan0 up

echo "Reloading wpa_supplicant…"
if systemctl list-units --full -all | grep -q "wpa_supplicant@wlan0.service"; then
  systemctl restart wpa_supplicant@wlan0.service
else
  systemctl restart wpa_supplicant.service
fi

echo "Re‑starting DHCP on wlan0…"
systemctl restart dhcpcd.service

echo "Done. Attempting to connect to '$SSID'…"
