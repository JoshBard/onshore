import time
import csv
import random
import threading
import requests
import socket
from datetime import datetime
from pubsub import pub

import config
from receive_logger import log_message

# Reuse the singleton interface
INTERFACE = config.INTERFACE

# Connection tracking
is_connected   = False
last_tlm_time  = None
connection_lock = threading.Lock()

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

def update_status_file(status: bool):
    config.STATUS_FILE.write_text("connected" if status else "disconnected")

def ensure_csv():
    config.TELEM_CSV.parent.mkdir(parents=True, exist_ok=True)
    if not config.TELEM_CSV.exists():
        with config.TELEM_CSV.open("w", newline="") as f:
            csv.writer(f).writerow(config.CSV_HEADER)
        log_message("INFO","TLM",f"Created {config.TELEM_CSV}")

ensure_csv()
update_status_file(False)

def is_duplicate(msg_id: str) -> bool:
    if not config.PROCESSED_IDS_FILE.exists():
        config.PROCESSED_IDS_FILE.write_text("")
    seen = set(config.PROCESSED_IDS_FILE.read_text().splitlines())
    return msg_id in seen

def mark_processed(msg_id: str):
    config.PROCESSED_IDS_FILE.write_text(
        config.PROCESSED_IDS_FILE.read_text() + msg_id + "\n"
    )

def trim_csv():
    rows = list(csv.reader(config.TELEM_CSV.open()))
    if len(rows) - 1 > config.MAX_ENTRIES:
        kept = [rows[0]] + rows[-config.MAX_ENTRIES:]
        with config.TELEM_CSV.open("w", newline="") as f:
            csv.writer(f).writerows(kept)
        log_message("INFO","TLM",f"Trimmed to last {config.MAX_ENTRIES}")

def process_telem_update(raw: str):
    if raw.startswith("TELEM_"):
        raw = raw[len("TELEM_"):]
    parts = dict(item.split("=",1) for item in raw.split("|") if "=" in item)
    for k in config.EXPECTED_KEYS:
        parts.setdefault(k,"")
    if not parts["LAT"] or not parts["LON"]:
        log_message("FAILED","TLM","Missing LAT/LON")
        return
    row = [
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        *(parts[k] for k in config.EXPECTED_KEYS),
        random.randint(0,99)
    ]
    try:
        with config.TELEM_CSV.open("a", newline="") as f:
            csv.writer(f).writerow(row)
        log_message("SUCCESS","TLM","Appended telemetry")
        trim_csv()
    except Exception as e:
        log_message("FAILED","TLM",f"Append error: {e}")

def connection_monitor():
    global is_connected, last_tlm_time
    while True:
        time.sleep(10)
        with connection_lock:
            if last_tlm_time is None or time.time() - last_tlm_time > 120:
                if is_connected:
                    is_connected = False
                    update_status_file(False)
                    log_message("INFO","CONN","Connection lost")

def filter_alert_message(message: str) -> str | None:
    if message.startswith("STAT_"):
        parts = message.split(":",1)
        return parts[1].strip() if len(parts)>1 else message[len("STAT_"):]
    return None

def display_popup(text: str):
    def post():
        url = f"http://{get_local_ip()}:3000/api/alert"
        try:
            requests.post(url, json={"message":text}).raise_for_status()
        except Exception as e:
            log_message("FAILED","POPUP",f"{e}")
    threading.Thread(target=post, daemon=True).start()

def handle_message(packet, interface=None):
    global is_connected, last_tlm_time

    if packet.get("fromId","") != config.SOURCE_ID:
        return
    text   = packet.get("decoded",{}).get("text","")
    msg_id = str(packet.get("id",""))
    if not text or is_duplicate(msg_id):
        return
    mark_processed(msg_id)
    log_message("RECEIVED","MSG",text)

    if text.startswith("TLM_"):
        with connection_lock:
            is_connected  = True
            last_tlm_time = time.time()
        update_status_file(True)
        log_message("RECEIVED","TLM",text)
        process_telem_update(text)

    elif text.startswith("STAT_"):
        popup = filter_alert_message(text)
        if popup:
            display_popup(popup)
        else:
            log_message("FAILED","POPUP",f"Bad STAT: {text}")

    else:
        log_message("FAILED","UNKNOWN",text)

# --- Main ---
threading.Thread(target=connection_monitor, daemon=True).start()
pub.subscribe(handle_message, "meshtastic.receive")

print(f"Listening for Meshtastic messages from {config.SOURCE_ID}…")
try:
    while True:
        time.sleep(0.1)
except KeyboardInterrupt:
    print("Shutting down…")
    INTERFACE.close()