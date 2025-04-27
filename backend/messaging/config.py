import os
from pathlib import Path
from dotenv import load_dotenv
from meshtastic.tcp_interface import TCPInterface

# Load environment
load_dotenv(Path(__file__).parent / ".env")

# Meshtastic
MESHTASTIC_HOST = os.getenv("MESHTASTIC_HOST", "localhost")
CHANNEL_INDEX   = int(os.getenv("CHANNEL_INDEX", "5"))
INTERFACE       = TCPInterface(hostname=MESHTASTIC_HOST)

# Node settings
SCRIPT_DIR        = Path(__file__).parent
PROCESSED_IDS_FILE = SCRIPT_DIR / ".processed_msg_ids"
SOURCE_ID          = os.getenv("SOURCE_ID", "!eb15a9fe")
STATUS_FILE        = SCRIPT_DIR / "connection_status.txt"

# Telemetry CSV
TELEM_CSV     = SCRIPT_DIR.parent / "telemetry_data" / "live_telem.csv"
MAX_ENTRIES   = 1000
EXPECTED_KEYS = ["BATT","CUR","LVL","GPS_FIX","GPS_SATS","LAT","LON","ALT","MODE"]
CSV_HEADER    = ["timestamp"] + EXPECTED_KEYS + ["sensor_data"]

# Waypoints CSV
WAYPOINTS_CSV = SCRIPT_DIR.parent / "waypoints" / "waypoints.csv"
ACK_DELAY     = float(os.getenv("ACK_DELAY", "0.5"))
