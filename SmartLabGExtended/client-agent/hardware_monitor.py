"""SmartLab Guardian - hardware removal agent (runs on each lab PC, Windows only).

Setup:
    pip install -r requirements.txt
    copy config.example.json config.json   (then edit pc_id / agent_key)
    python hardware_monitor.py

Use interval_seconds = 5 while testing and 300 (5 minutes) for the real lab.
"""
import datetime
import json
import os
import socket
import time

import requests

HERE = os.path.dirname(os.path.abspath(__file__))


def load_config():
    with open(os.path.join(HERE, "config.json"), encoding="utf-8") as f:
        cfg = json.load(f)
    cfg.setdefault("pc_id", socket.gethostname())
    cfg.setdefault("interval_seconds", 300)
    cfg.setdefault("agent_key", "")
    return cfg


def scan_devices(wmi_conn):
    """Return {PNPDeviceID: (device_type, name)} for the hardware we care about.

    Only real peripherals are tracked. Virtual/software devices (Win32_PnPEntity has
    hundreds) appear and disappear all the time and would cause false alarms.
    """
    found = {}

    def add(items, dev_type, name_attr):
        for item in items:
            key = getattr(item, "PNPDeviceID", None)
            if key:
                found[key] = (dev_type, getattr(item, name_attr, None) or dev_type)

    add(wmi_conn.Win32_Keyboard(), "Keyboard", "Name")
    add(wmi_conn.Win32_PointingDevice(), "Mouse", "Name")
    add(wmi_conn.Win32_DesktopMonitor(), "Monitor", "Name")
    add(wmi_conn.Win32_DiskDrive(), "Disk", "Model")
    # USB devices (flash drives, USB mouse/keyboard, webcams ...) - skip hubs/controllers.
    # The WHERE clause makes WMI return only USB entities instead of all 100+ PnP devices,
    # which keeps the agent's CPU usage low.
    usb_query = (
        "SELECT PNPDeviceID, Caption FROM Win32_PnPEntity "
        r"WHERE PNPDeviceID LIKE 'USB\\VID_%'"
    )
    for item in wmi_conn.query(usb_query):
        key = getattr(item, "PNPDeviceID", None) or ""
        caption = getattr(item, "Caption", None) or ""
        if key and "hub" not in caption.lower() and key not in found:
            found[key] = ("USB", caption or key)
    return found


def removed_devices(previous, current):
    """Devices present in the previous scan but missing now."""
    return {k: v for k, v in previous.items() if k not in current}


def build_payload(pc_id, key, dev_type, name):
    return {
        "pc_id": pc_id,
        "hardware_id": key,
        "device_name": name,
        "device_type": dev_type,
        "removal_time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


def send_alert(cfg, payload):
    """Return True when the server accepted the alert."""
    try:
        r = requests.post(
            cfg["api_url"],
            json=payload,
            headers={"x-agent-key": cfg["agent_key"]},
            timeout=10,
        )
        if r.status_code in (200, 201):
            print(f"[SENT] {payload['device_type']} removed: {payload['device_name']}")
            return True
        print(f"[ERROR] Server replied {r.status_code}: {r.text}")
        # 4xx means the request itself is wrong - retrying will not help
        return 400 <= r.status_code < 500
    except requests.RequestException as e:
        print(f"[WARN] Server unreachable, will retry: {e}")
        return False


def main():
    import wmi  # imported here so the helper functions can be tested on non-Windows machines

    cfg = load_config()
    wmi_conn = wmi.WMI()
    unsent = []  # alerts waiting for the server to come back (network outage)

    previous = scan_devices(wmi_conn)
    print(f"=== SmartLab Guardian agent started on {cfg['pc_id']} ({len(previous)} devices) ===")

    while True:
        time.sleep(cfg["interval_seconds"])
        try:
            current = scan_devices(wmi_conn)
        except Exception as e:  # a failed scan must never kill the agent
            print(f"[WARN] Scan failed: {e}")
            continue

        for key, (dev_type, name) in removed_devices(previous, current).items():
            print(f"[ALERT] Device disconnected: {name}")
            unsent.append(build_payload(cfg["pc_id"], key, dev_type, name))

        unsent = [p for p in unsent if not send_alert(cfg, p)]
        previous = current


if __name__ == "__main__":
    main()
