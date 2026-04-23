import paho.mqtt.client as mqtt
import requests
import json
import sys
import threading
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse

# =====================================================================
# PILL PAL ESP32 HARDWARE SIMULATOR (EVENT-DRIVEN ARCHITECTURE)
# =====================================================================
# Instructions to run:
# 1. Open a new terminal inside your project
# 2. Run: pip install paho-mqtt requests
# 3. Before running, grab the MAC address of your device from Supabase
#    (Table: devices, Column: mac_address). Paste it here!
# 4. Run: python mock_esp32.py
# =====================================================================

# 🔹 Edit this to match the SERIAL_NUMBER in your Supabase database!
SERIAL_NUMBER = "SN-A1B2C3" 

MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
API_DISPENSE = "http://localhost:3000/api/dispense"
API_PING = "http://localhost:3000/api/ping"

current_slot = 0
NUM_SLOTS = 8

schedule = [
    {"hour": 9, "minute": 0},
    {"hour": 13, "minute": 0},
    {"hour": 20, "minute": 0}
]
last_dispensed_hour = -1

def on_connect(client, userdata, flags, rc):
    print(f"\n[MQTT] Connected to {MQTT_BROKER} (Code {rc})")
    topic = f"pillpal/cmd/{SERIAL_NUMBER}"
    client.subscribe(topic)
    print(f"[MQTT] Fully Subscribed to topic: {topic}")
    print("\n[System] MOCK ESP32 RUNNING. Waiting for dashboard commands...")
    print("---------------------------------------------------------------")

def telemetry_heartbeat():
    while True:
        try:
            res = requests.post(API_PING, json={"serial_number": SERIAL_NUMBER}, timeout=2)
            if res.status_code == 200:
                data = res.json()
                if "schedule" in data:
                    global schedule
                    new_schedule = data["schedule"]
                    if str(schedule) != str(new_schedule):
                        schedule = new_schedule
                        print(f"\n🔄 [System] Schedule synced from cloud: {schedule}")
        except Exception:
            pass
        time.sleep(10)

def auto_schedule_loop():
    global last_dispensed_hour
    while True:
        now = datetime.now()
        current_hour = now.hour
        current_minute = now.minute
        
        for s in schedule:
            if s.get("hour") == current_hour and s.get("minute") == current_minute:
                if last_dispensed_hour != current_hour:
                    print(f"\n⏰ [AUTO-SCHEDULE] Time matches {current_hour}:{current_minute:02d}! Auto-dispensing...")
                    day_index = now.weekday()
                    session_index = schedule.index(s)
                    target_slot = 1 + (day_index * 3) + session_index
                    # Mod for 8 slot wheel logic (just for mock purposes)
                    target_slot = target_slot % 8 if target_slot % 8 != 0 else 8
                    trigger_dispense(target_slot)
                    last_dispensed_hour = current_hour
        time.sleep(15)

def trigger_dispense(target_slot):
    global current_slot
    steps_needed = (target_slot - current_slot + NUM_SLOTS) % NUM_SLOTS
    
    print(f"\n⚡ [ACTION RECEIVED] Dispense command for slot {target_slot}")
    print(f"⚙️  [Hardware] Rotating motor {steps_needed} steps forward...")
    
    # Simulate motor spinning delay
    for i in range(steps_needed):
        time.sleep(0.1) 
    
    current_slot = target_slot
    print(f"✅ [Hardware] Done. Slot {target_slot} successfully dispensed.")
    
    print("☁️  [Cloud Sync] Logging dispense event to Next.js API...")
    try:
        payload = {"serial_number": SERIAL_NUMBER, "slot_number": target_slot}
        res = requests.post(API_DISPENSE, json=payload, headers={"Content-Type": "application/json"})
        if res.status_code in [200, 201]:
            print("✅ [Cloud Sync] Supabase Postgres updated successfully. Check your dashboard!")
        else:
            print(f"❌ [Cloud Sync] FAILED to update database (Code: {res.status_code})")
            print(f"Response: {res.text}")
    except Exception as e:
        print(f"⚠️ [Cloud Sync] Network error connecting to localhost:3000 -> {e}")

def trigger_reset():
    global current_slot
    print("\n⚡ [ACTION RECEIVED] Reset Motor command")
    steps_needed = (0 - current_slot + NUM_SLOTS) % NUM_SLOTS
    print(f"⚙️  [Hardware] Rotating motor {steps_needed} steps to return to HOME slot (0)...")
    for _ in range(steps_needed):
        time.sleep(0.1)
    
    current_slot = 0
    print("✅ [Hardware] Wheel zeroed successfully.")

def on_message(client, userdata, msg):
    payload = msg.payload.decode()
    print(f"\n📨 [MQTT PACKET INBOUND] {payload}")
    
    try:
        data = json.loads(payload)
        action = data.get("action")
        
        if action == "dispense":
            target = data.get("slot", 0)
            trigger_dispense(target)
        elif action == "reset":
            trigger_reset()
    except Exception as e:
        print(f"❌ [Error] Failed to parse JSON payload: {e}")

def start_mqtt_engine():
    global client
    client = mqtt.Client(client_id=f"PillPalSim-{int(time.time())}")
    client.on_connect = on_connect
    client.on_message = on_message
    
    print("\n[Mock] Connecting to broker.hivemq.com (Zero-Latency MQTT)...")
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    
    # Start background threads
    threading.Thread(target=telemetry_heartbeat, daemon=True).start()
    threading.Thread(target=auto_schedule_loop, daemon=True).start()
    
    client.loop_forever()

class CaptivePortalHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        html = """
        <html><head><meta name='viewport' content='width=device-width, initial-scale=1'><style>
        body{font-family:sans-serif;background:#18181b;color:white;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}
        .card{background:#27272a;padding:2rem;border-radius:1rem;text-align:center;width:300px;box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.1);}
        input{width:100%;margin-bottom:1rem;padding:0.75rem;border-radius:0.5rem;border:none;background:#3f3f46;color:white;box-sizing:border-box;}
        button{background:#0284c7;color:white;border:none;padding:0.75rem 1.5rem;border-radius:0.5rem;cursor:pointer;width:100%;font-weight:bold;}
        </style></head>
        <body><div class='card'><h2>PillPal Setup</h2><p style='color:#a1a1aa;font-size:14px;margin-bottom:1.5rem'>Mock ESP32 Captive Portal</p>
        <form method='POST'>
        <input name='ssid' placeholder='WiFi Name' required/>
        <input name='pass' type='password' placeholder='Password' required/>
        <button type='submit'>Connect</button>
        </form></div></body></html>
        """
        self.wfile.write(html.encode())

    def do_POST(self):
        length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(length).decode('utf-8')
        params = urllib.parse.parse_qs(post_data)
        
        ssid = params.get('ssid', [''])[0]
        password = params.get('pass', [''])[0]
        
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        success_html = f"<html><body style='font-family:sans-serif;background:#18181b;color:white;text-align:center;padding-top:20%'><h2 style='color:#10b981'>Saved!</h2><p>Connecting to {ssid}...</p></body></html>"
        self.wfile.write(success_html.encode())
        
        print(f"\n[WiFiManager] Received credentials! SSID: {ssid} | PASS: {'*' * len(password)}")
        print("[WiFiManager] Rebooting into MQTT Mode...")
        
        # Give the browser 1 second to render the success page, then trigger MQTT
        threading.Timer(1.0, start_mqtt_engine).start()

if __name__ == "__main__":
    print("\n==========================================")
    print("   Pill Pal ESP32 Python MQTT Simulator   ")
    print("==========================================")
    
    if SERIAL_NUMBER == "YOUR_SN_HERE":
        print("⚠️ WARNING: You left the SERIAL_NUMBER as default.")
        print("Your Next.js dashboard uses a specific SN to target this device.")
        print("You may need to change SERIAL_NUMBER inside this python file to match your DB!")
        print("Waiting 3s before continuing...")
        time.sleep(3)
        
    print("\n[Hardware Boot] Initializing...")
    print("📡 [WiFiManager] Started Captive Portal AP 'PillPal-Setup'")
    print("👉 Open your browser to: http://localhost:8080 to configure WiFi!")
    
    server_address = ('', 8080)
    httpd = HTTPServer(server_address, CaptivePortalHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[System] Shutting down...")
        sys.exit(0)
