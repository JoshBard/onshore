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
from flask import Flask, request
from transmit import process_manual, process_mission, process_waypoints

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

def display_popup(text: str):
    def post():
        url = f"http://{get_local_ip()}:3000/api/alert"
        try:
            requests.post(url, json={"message":text}).raise_for_status()
        except Exception as e:
            log_message("FAILED","POPUP",f"{e}")
    threading.Thread(target=post, daemon=True).start()

def handle_message(packet, iface):
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
        if text:
            display_popup(text)
        else:
            log_message("FAILED","POPUP",f"Bad STAT: {text}")

    else:
        log_message("FAILED","UNKNOWN",text)

# --- HTTP API for sending, over the same INTERFACE ---
app = Flask(__name__)

@app.route("/sendWaypoints", methods=["POST"])
def http_send_waypoints():
    process_waypoints()
    return "", 200

@app.route("/start_manual", methods=["POST"])
def http_start_manual():
    process_mission("START_MSSN")
    return "", 200

@app.route("/stop_manual", methods=["POST"])
def http_stop_manual():
    process_mission("STOP_MAN")
    return "", 200

@app.route("/start_mission", methods=["POST"])
def http_start_mission():
    process_mission("START_MSSN")
    return "", 200

@app.route("/resume_manual", methods=["POST"])
def http_resume_manual():
    process_mission("RESUME_MSSN")
    return "", 200

@app.route("/stop_mission", methods=["POST"])
def http_stop_mission():
    process_mission("STOP_MSSN")
    return "", 200

@app.route("/arm", methods=["POST"])
def http_arm():
    process_mission("ARM")
    return "", 200

@app.route("/disarm", methods=["POST"])
def http_disarm():
    process_mission("DISARM")
    return "", 200

@app.route("/rtl", methods=["POST"])
def http_rtl():
    process_mission("START_RTL")
    return "", 200

@app.route("/sailboat", methods=["POST"])
def http_sailboat():
    process_mission("SAIL")
    return "", 200

@app.route("/motor_boat", methods=["POST"])
def http_motor_boat():
    process_mission("MOTOR")
    return "", 200

@app.route("/send", methods=["POST"])
def http_send():
    data = request.get_json() or {}
    t = data.get("type")
    p = data.get("payload")
    if t == "MAN":
        process_manual(p)
    elif t == "MSSN":
        process_mission(p)
    elif t == "WP":
        process_waypoints()
    else:
        return {"error": "Unknown type"}, 400
    return {"status": "queued"}, 200

# Start the Flask server
import threading
threading.Thread(
    target=lambda: app.run(host="127.0.0.1", port=5000, threaded=True, use_reloader=False),
    daemon=True
).start()

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