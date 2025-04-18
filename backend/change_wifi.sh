#!/bin/bash
#
# add-and-activate-network.sh — add Wi‑Fi via wpa_cli and switch to it
# Usage: sudo ./add-and-activate-network.sh <SSID> <PASSWORD>

set -euo pipefail

# ——— sanity checks ————————————————————————————————
if [ "$(id -u)" -ne 0 ]; then
  echo "Error: must be run as root" >&2
  exit 1
fi
if [ $# -ne 2 ]; then
  echo "Usage: sudo $0 <SSID> <PASSWORD>" >&2
  exit 1
fi

IFACE="wlan0"
SSID="$1"
PSK="$2"

# ——— make sure wpa_cli can talk to wpa_supplicant ——————————————
# (adjust -p if you have a nonstandard ctrl_interface)
CTRL_OPTS="-i ${IFACE}"

echo "→ Adding new network to wpa_supplicant…"
NET_ID=$(wpa_cli ${CTRL_OPTS} add_network)
echo "   network id = $NET_ID"

echo "→ Setting SSID and PSK…"
wpa_cli ${CTRL_OPTS} set_network "$NET_ID" ssid "\"${SSID}\""
wpa_cli ${CTRL_OPTS} set_network "$NET_ID" psk "\"${PSK}\""

echo "→ Enabling new network…"
wpa_cli ${CTRL_OPTS} enable_network "$NET_ID"

echo "→ Saving configuration to disk…"
wpa_cli ${CTRL_OPTS} save_config

echo "→ Triggering reconfigure…"
wpa_cli ${CTRL_OPTS} reconfigure

# ——— ensure interface is up and request DHCP ——————————————————
echo "→ Unblocking & bringing up ${IFACE}…"
rfkill unblock wifi || true
ip link set "${IFACE}" up

echo "→ Restarting dhcpcd…"
systemctl restart dhcpcd.service

# ——— final status ——————————————————————————————————————
sleep 2
echo
echo "wpa_cli status:"
wpa_cli ${CTRL_OPTS} status | grep -E 'wpa_state|ssid|id=' || true
echo
echo "IP address:"
ip addr show "${IFACE}" | grep inet || echo "  (no address yet)"
