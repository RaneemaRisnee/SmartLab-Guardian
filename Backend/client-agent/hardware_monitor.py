import time
import datetime
import requests
import wmi

c = wmi.WMI()
API_URL = "http://localhost:5000/api/alerts/log-alert"

# අදාළ PC සහ Hardware හඳුනාගැනීමේ IDs
PC_ID = "LAB-01-PC-12"          # PC අංකය හෝ ID එක
HARDWARE_ID = "HW-USB-004"       # Device ID එක

def get_connected_devices():
    devices = set()
    for item in c.Win32_PnPEntity():
        if item.Caption:
            devices.add(item.Caption)
    return devices

def send_alert(device_name):
    # Removal Time එක ISO format එකෙන් ලබා ගැනීම
    current_time = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # අවශ්‍ය සියලුම ක්ෂේත්‍ර 5 සහිත Payload එක
    payload = {
        "pc_id": PC_ID,
        "hardware_id": HARDWARE_ID,
        "device_name": device_name,
        "removal_time": current_time,
        "resolved_status": "Pending"
    }

    try:
        response = requests.post(API_URL, json=payload)
        if response.status_code == 201:
            print(f"[SUCCESS] Alert sent to server: {device_name} (PC: {PC_ID}, HW: {HARDWARE_ID})")
        else:
            print(f"[ERROR] Server responded with code: {response.status_code}")
            print(f"[DETAILS]: {response.text}")
    except Exception as e:
        print(f"[ERROR] Failed to connect to server: {e}")

print("=== SmartLab Guardian Hardware Agent Started ===")
previous_devices = get_connected_devices()

while True:
    time.sleep(5)
    current_devices = get_connected_devices()
    disconnected_devices = previous_devices - current_devices

    for dev in disconnected_devices:
        print(f"[ALERT] Device disconnected: {dev}")
        send_alert(dev)

    previous_devices = current_devices