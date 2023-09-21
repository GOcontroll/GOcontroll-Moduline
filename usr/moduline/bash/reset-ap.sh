#!/bin/sh

WIFI_UUIDS=$(nmcli connection show | grep wifi | grep -E -o '[0-9a-f\-]{36}')
AP_SSID_DIRTY=$(nmcli -t con show GOcontroll-AP | grep "\.ssid:")
AP_SSID="${AP_SSID_DIRTY#802-11-wireless.ssid:}"
while IFS= read -r UUID; do nmcli connection delete $UUID; done <<< "$WIFI_UUIDS"
nmcli con add type wifi con-name "GOcontroll-AP" ifname wlan0 ssid $AP_SSID ipv4.addresses 192.168.19.85/16 ipv4.method manual connection.autoconnect yes 802-11-wireless.mode ap 802-11-wireless.band bg wifi-sec.psk Moduline 802-11-wireless-security.key-mgmt wpa-psk
