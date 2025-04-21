import sys
import csv
import time
import queue
import threading
from pathlib import Path

import config
from transmit_logger import log_message

# Shared interface
INTERFACE = config.INTERFACE

# Task queue
send_queue = queue.Queue()

def process_manual(cmd: str):
    msg = f"MAN_{cmd.upper()}"
    try:
        INTERFACE.sendText(msg, channelIndex=config.CHANNEL_INDEX, wantAck=True)
        log_message("SUCCESS","MAN", msg)
    except Exception as e:
        log_message("FAILED","MAN", f"{msg} | {e}")

def process_mission(cmd: str):
    msg = f"MSSN_{cmd.upper()}"
    try:
        INTERFACE.sendText(msg, channelIndex=config.CHANNEL_INDEX, wantAck=True)
        log_message("SUCCESS","MSSN", msg)
    except Exception as e:
        log_message("FAILED","MSSN", f"{msg} | {e}")

def process_waypoints():
    path = Path(config.WAYPOINTS_CSV)
    if not path.exists():
        log_message("FAILED","WP",f"No CSV at {path}")
        return
    rows = list(csv.reader(path.open()))
    if len(rows)<=1:
        log_message("FAILED","WP","No waypoint data")
        return

    for idx, line in enumerate(rows[1:]):
        msg = f"WP_{idx}:{','.join(line)}"
        log_message("INFO","WP",f"Sending {idx}")
        try:
            INTERFACE.sendText(msg, channelIndex=config.CHANNEL_INDEX, wantAck=True)
        except Exception as e:
            log_message("FAILED","WP",f"{msg} | {e}")
        time.sleep(config.ACK_DELAY)

    try:
        INTERFACE.sendText("WP_FINISHED", channelIndex=config.CHANNEL_INDEX, wantAck=True)
        log_message("SUCCESS","WP","WP_FINISHED sent")
    except Exception as e:
        log_message("FAILED","WP",f"WP_FINISHED | {e}")

def worker():
    while True:
        task = send_queue.get()
        if task is None:
            break
        t, payload = task
        if t=="MAN":
            process_manual(payload)
        elif t=="MSSN":
            process_mission(payload)
        elif t=="WP":
            process_waypoints()
        else:
            log_message("FAILED",t,"Unknown task")
        send_queue.task_done()

threading.Thread(target=worker, daemon=True).start()

def main():
    if len(sys.argv)<2:
        log_message("FAILED","UNKNOWN","No message type")
        sys.exit(1)
    mtype = sys.argv[1].upper()
    if mtype=="WP":
        send_queue.put(("WP",None))
    elif mtype in ("MAN","MSSN"):
        if len(sys.argv)<3:
            log_message("FAILED",mtype,"No command")
            sys.exit(1)
        send_queue.put((mtype, sys.argv[2]))
    else:
        log_message("FAILED",mtype,"Invalid type")
        sys.exit(1)

    send_queue.join()
    send_queue.put(None)

if __name__=="__main__":
    main()
