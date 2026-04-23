/*
  ============================================================
  Weekly Pill Dispenser — EVENT DRIVEN MQTT + REST HYBRID
  ============================================================
  Install via Arduino Library Manager:
    - "PubSubClient" by Nick O'Leary
    - "ArduinoJson" by Benoit Blanchon
    - "WiFiManager" by tzapu (for Captive Portal)
*/

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h> // https://github.com/tzapu/WiFiManager
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include "time.h"

// ── Configuration ─────────────────────────────────────────
const char* API_URL_DISPENSE = "http://192.168.1.100:3000/api/dispense";
const char* API_URL_PING     = "http://192.168.1.100:3000/api/ping";
const char* MQTT_BROKER      = "broker.hivemq.com";
const int   MQTT_PORT        = 1883;

// ── NTP Settings ──────────────────────────────────────────
const char* NTP_SERVER          = "pool.ntp.org";
const long  GMT_OFFSET_SEC      = 3600;  // UTC+1 for Tunisia
const int   DAYLIGHT_OFFSET_SEC = 0;

// ── Stepper Configuration ─────────────────────────────────
#define IN1 19
#define IN2 18
#define IN3  5
#define IN4 17

#define STEPS_PER_REV   4096
#define STEP_DELAY_US   1000
#define NUM_SLOTS       8
#define STEPS_PER_SLOT  (STEPS_PER_REV / NUM_SLOTS)

const int stepSequence[8][4] = {
  {1,0,0,0},{1,1,0,0},{0,1,0,0},{0,1,1,0},
  {0,0,1,0},{0,0,1,1},{0,0,0,1},{1,0,0,1}
};

// ── State ─────────────────────────────────────────────────
int  currentSlot       = 0;
const char* SERIAL_NUMBER = "SN-A1B2C3";

struct DispenseTime { int hour; int minute; };
DispenseTime schedule[3] = {
  { 9,  0},  // Morning
  {13,  0},  // Midday
  {20,  0}   // Night
};
int  lastDispensedHour = -1;
int  lastDispensedDay  = -1;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ─────────────────────────────────────────────────────────
// Stepper helpers
// ─────────────────────────────────────────────────────────
void stepMotor(int stepIndex) {
  digitalWrite(IN1, stepSequence[stepIndex][0]);
  digitalWrite(IN2, stepSequence[stepIndex][1]);
  digitalWrite(IN3, stepSequence[stepIndex][2]);
  digitalWrite(IN4, stepSequence[stepIndex][3]);
}

void releaseStepper() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
}

void rotateSteps(int steps) {
  static int stepIndex = 0;
  for (int i = 0; i < steps; i++) {
    stepIndex = (stepIndex + 1) % 8;
    stepMotor(stepIndex);
    delayMicroseconds(STEP_DELAY_US);
  }
  releaseStepper();
}

void advanceOneSlot() {
  rotateSteps(STEPS_PER_SLOT);
  currentSlot = (currentSlot + 1) % NUM_SLOTS;
}

// ─────────────────────────────────────────────────────────
// API Logger & Telemetry
// ─────────────────────────────────────────────────────────
void sendHeartbeatAndSyncSchedule() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL_PING);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"serial_number\":\"" + String(SERIAL_NUMBER) + "\"}";
    int code = http.POST(payload);
    
    if (code > 0) {
      String response = http.getString();
      StaticJsonDocument<512> doc;
      DeserializationError err = deserializeJson(doc, response);
      if (!err && doc.containsKey("schedule")) {
         JsonArray schedArr = doc["schedule"];
         if (schedArr.size() == 3) {
            for (int i=0; i<3; i++) {
               schedule[i].hour = schedArr[i]["hour"] | schedule[i].hour;
               schedule[i].minute = schedArr[i]["minute"] | schedule[i].minute;
            }
         }
      }
    }
    http.end();
  }
}

void sendDispenseLog(int slotValue) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL_DISPENSE);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"serial_number\":\"" + String(SERIAL_NUMBER) + "\",\"slot_number\":" + String(slotValue) + "}";
    int code = http.POST(payload);
    
    if (code > 0) Serial.printf("[Cloud Log] Sync successful (Code: %d)\n", code);
    else Serial.printf("[Cloud Log] Sync FAILED (Code: %d)\n", code);
    
    http.end();
  }
}

// ─────────────────────────────────────────────────────────
// Action Handlers
// ─────────────────────────────────────────────────────────
void triggerDispense(int targetSlot) {
  targetSlot = (targetSlot % NUM_SLOTS == 0) ? NUM_SLOTS : (targetSlot % NUM_SLOTS);
  int stepsNeeded = (targetSlot - currentSlot + NUM_SLOTS) % NUM_SLOTS;
  Serial.printf("\n[ACTION] Dispensing %d slot(s) → slot %d\n", stepsNeeded, targetSlot);

  for (int i = 0; i < stepsNeeded; i++) {
    advanceOneSlot();
    delay(100);
  }
  
  // Log event in Postgres!
  sendDispenseLog(targetSlot);
}

void triggerReset() {
  Serial.println("\n[ACTION] Resetting Motor to Slot 0!");
  int stepsNeeded = (0 - currentSlot + NUM_SLOTS) % NUM_SLOTS;
  for (int i = 0; i < stepsNeeded; i++) advanceOneSlot();
  currentSlot = 0;
  Serial.println("[ACTION] Wheel zeroed.");
}

// ─────────────────────────────────────────────────────────
// MQTT Engine
// ─────────────────────────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  
  Serial.printf("\n[MQTT Event] Received: %s\n", message.c_str());

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) return;

  String action = doc["action"].as<String>();
  
  if (action == "dispense") {
    int target = doc["slot"].as<int>();
    triggerDispense(target);
  } else if (action == "reset") {
    triggerReset();
  }
}

void reconnectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting to broker.hivemq.com... ");
    String clientId = "PillPal-" + String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("OK");
      String topicStr = String("pillpal/cmd/") + String(SERIAL_NUMBER);
      mqttClient.subscribe(topicStr.c_str());
    } else {
      delay(5000);
    }
  }
}

// ─────────────────────────────────────────────────────────
// Boot & Loop
// ─────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Pill Dispenser EVENT-DRIVEN CORE Starting ===");

  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  releaseStepper();

  // WiFiManager: Local intialization. Once its business is done, there is no need to keep it around
  WiFiManager wm;
  
  // Set a dark theme for the Captive Portal
  wm.setClass("invert");

  // Automatically connect using saved credentials,
  // if connection fails, it starts an access point with the specified name: "PillPal-Setup"
  bool res = wm.autoConnect("PillPal-Setup"); 
  
  if(!res) {
      Serial.println("Failed to connect to WiFi. Restarting...");
      delay(3000);
      ESP.restart();
  } 
  
  Serial.println("\n[WiFi] Connected to Home Network! Device SN: " + String(SERIAL_NUMBER));

  // Sync Hardware Clock to World Time
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
  Serial.println("[NTP] Clock synchronized.");

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  Serial.println("[System] Ready.");
}

unsigned long lastPing = 0;
unsigned long lastAutoCheck = 0;

void loop() {
  if (!mqttClient.connected()) reconnectMqtt();
  mqttClient.loop();

  unsigned long now = millis();
  
  // Heartbeat & Database Schedule Sync (Every 10 seconds)
  if (now - lastPing > 10000) {
    lastPing = now;
    sendHeartbeatAndSyncSchedule();
  }

  // Auto-Dispense Time Check (Every 30 seconds)
  if (now - lastAutoCheck > 30000) {
    lastAutoCheck = now;
    struct tm timeInfo;
    if (getLocalTime(&timeInfo)) {
      int currentHour   = timeInfo.tm_hour;
      int currentMinute = timeInfo.tm_min;
      int currentWday   = timeInfo.tm_wday; // 0=Sun, 1=Mon

      for (int s = 0; s < 3; s++) {
        if (currentHour == schedule[s].hour && currentMinute == schedule[s].minute) {
          if (!(lastDispensedHour == currentHour && lastDispensedDay == currentWday)) {
             int dayIndex = (currentWday == 0) ? 6 : (currentWday - 1);
             int targetSlot = 1 + (dayIndex * 3) + s;
             
             Serial.printf("\n[Schedule] AUTO-DISPENSE TRIGGERED! Day=%d, Session=%d\n", dayIndex, s);
             triggerDispense(targetSlot);
             
             lastDispensedHour = currentHour;
             lastDispensedDay = currentWday;
          }
        }
      }
    }
  }
}