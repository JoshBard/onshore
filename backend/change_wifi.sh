#!/bin/bash
#
# switch-to-client.sh — switch from AP mode back to Wi‑Fi client
# Usage: sudo ./switch-to-client.sh <SSID> <PASSWORD>

set -e

# ensure root
if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root: sudo $0 <SSID> <PASSWORD>"
  exit 1
fi

# args check
if [ $# -ne 2 ]; then
  echo "Usage: sudo $0 <SSID> <PASSWORD>"
  exit 1
fi

SSID="$1"
PSK="$2"

echo "→ Stopping AP services if present…"
for svc in hostapd dnsmasq; do
  if systemctl list-unit-files --type=service | grep -qw "${svc}.service"; then
    echo "   • $svc: stopping & disabling"
    systemctl stop "$svc"
    systemctl disable "$svc"
  else
    echo "   • $svc: not installed, skipping"
  fi
done

echo "→ Re‑enabling DHCP client (dhcpcd)…"
if systemctl list-unit-files --type=service | grep -qw "dhcpcd.service"; then
  systemctl unmask dhcpcd.service
  systemctl enable dhcpcd.service
  systemctl restart dhcpcd.service
else
  echo "   • dhcpcd not found—make sure your network stack is configured appropriately"
fi

echo "→ Writing new wpa_supplicant config…"
cat > /etc/wpa_supplicant/wpa_supplicant.conf <<EOF
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=US

network={
    ssid="$SSID"
    psk="$PSK"
}
EOF

echo "→ Bringing up wlan0…"
ip link set wlan0 up

echo "→ Restarting wpa_supplicant…"
if systemctl list-units --all | grep -q "wpa_supplicant@wlan0.service"; then
  systemctl restart wpa_supplicant@wlan0.service
else
  systemctl restart wpa_supplicant.service
fi

echo "→ Restarting DHCP on wlan0…"
systemctl restart dhcpcd.service || true

echo "✔ Done. Attempting to connect to '$SSID'…"
ip addr show wlan0
iwconfig wlan0