/*
  ============================================================
  Weekly Pill Dispenser — ESP32 WROOM + 28BYJ-48 + ULN2003
  + HTTPClient HTTP API for Next.js / Supabase
  ============================================================
  Install via Arduino Library Manager:
    - "ArduinoJson" by Benoit Blanchon
*/

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "time.h"

// ── Configuration ─────────────────────────────────────────
const char* WIFI_SSID        = "mahdi";
const char* WIFI_PASSWORD    = "mahdi1818";
const char* API_URL_DISPENSE = "http://192.168.1.100:3000/api/dispense"; // CHANGE THIS TO YOUR LAPTOP IP
const char* API_URL_PING     = "http://192.168.1.100:3000/api/ping";     // CHANGE THIS TO YOUR LAPTOP IP

// ── NTP Settings ──────────────────────────────────────────
const char* NTP_SERVER          = "pool.ntp.org";
const long  GMT_OFFSET_SEC      = 3600;  // UTC+1 for Tunisia
const int   DAYLIGHT_OFFSET_SEC = 0;

// ── Stepper Motor Pins ────────────────────────────────────
#define IN1 19
#define IN2 18
#define IN3  5
#define IN4 17

// ── Stepper Configuration ─────────────────────────────────
#define STEPS_PER_REV   4096
#define STEP_DELAY_US   1000
#define NUM_SLOTS       22
#define STEPS_PER_SLOT  (STEPS_PER_REV / NUM_SLOTS)

const int stepSequence[8][4] = {
  {1,0,0,0},{1,1,0,0},{0,1,0,0},{0,1,1,0},
  {0,0,1,0},{0,0,1,1},{0,0,0,1},{1,0,0,1}
};

// ── Schedule (Local Fallback) ─────────────────────────────
struct DispenseTime { int hour; int minute; };
DispenseTime schedule[3] = {
  { 9,  0},  // Morning
  {13,  0},  // Midday
  {20,  0}   // Night
};

// ── State ─────────────────────────────────────────────────
int  currentSlot       = 0;
bool wifiConnected     = false;
int  lastDispensedHour = -1;
int  lastDispensedDay  = -1;
String macAddress      = "";

bool dispensed[7][3] = {};

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
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
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
  Serial.printf("[Stepper] Moved to slot %d\n", currentSlot);
}

int getDayIndex(int tm_wday) {
  return (tm_wday == 0) ? 6 : (tm_wday - 1);
}

int getTargetSlot(int dayIndex, int sessionIndex) {
  return 1 + (dayIndex * 3) + sessionIndex;
}

// ─────────────────────────────────────────────────────────
// Cloud API Methods
// ─────────────────────────────────────────────────────────
void sendPingTrigger() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL_PING);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"mac_address\":\"" + macAddress + "\",\"battery_level\":100}";
    int code = http.POST(payload);
    
    if (code > 0) {
      Serial.printf("[Cloud] Heartbeat Sent (Code: %d)\n", code);
      String response = http.getString();
      
      // Parse JSON
      StaticJsonDocument<512> doc;
      DeserializationError err = deserializeJson(doc, response);
      if (!err) {
         // Sync schedule
         JsonArray schedArr = doc["schedule"];
         if (schedArr.size() == 3) {
            for (int i=0; i<3; i++) {
               schedule[i].hour = schedArr[i]["hour"] | schedule[i].hour;
               schedule[i].minute = schedArr[i]["minute"] | schedule[i].minute;
            }
         }
         
         // Motor reset command
         if (doc["current_slot"] == 0 && currentSlot != 0) {
            Serial.println("\n[Cloud] Remote REST Command: Reset Motor to Slot 0!");
            memset(dispensed, 0, sizeof(dispensed));
            lastDispensedHour = -1; lastDispensedDay = -1;
            int stepsNeeded = (0 - currentSlot + NUM_SLOTS) % NUM_SLOTS;
            for (int i = 0; i < stepsNeeded; i++) advanceOneSlot();
            currentSlot = 0;
         }

         // Manual Web Dispense Trigger from Dashboard
         if (doc.containsKey("force_dispense")) {
            int target = doc["force_dispense"];
            Serial.printf("\n[Cloud] Remote WEB TRIGGER: Force Dispense Slot %d!\n", target);
            // Spin the motor and instantly send the log to Supabase
            dispense(target, -1, -1);
         }
      }
    } else {
      Serial.printf("[Cloud] Heartbeat Failed (Code: %d)\n", code);
    }
    
    http.end();
  }
}

void sendDispenseToCloud(int slotValue) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL_DISPENSE);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"mac_address\":\"" + macAddress + "\",\"slot_number\":" + String(slotValue) + "}";
    int code = http.POST(payload);
    
    if (code > 0) Serial.printf("[Cloud] Dispense Logged in Supabase (Code: %d)\n", code);
    else Serial.printf("[Cloud] Dispense Logging Failed (Code: %d)\n", code);
    
    http.end();
  }
}

// ─────────────────────────────────────────────────────────
// Dispense execution
// ─────────────────────────────────────────────────────────
void dispense(int targetSlot, int dayIndex, int sessionIndex) {
  int stepsNeeded = (targetSlot - currentSlot + NUM_SLOTS) % NUM_SLOTS;
  Serial.printf("[Dispenser] Moving %d slot(s) → slot %d\n", stepsNeeded, targetSlot);

  for (int i = 0; i < stepsNeeded; i++) {
    advanceOneSlot();
    delay(100);
  }

  if (dayIndex >= 0 && dayIndex < 7 && sessionIndex >= 0 && sessionIndex < 3) {
    dispensed[dayIndex][sessionIndex] = true;
  }

  Serial.printf("[Dispenser] Done — slot %d dispensed\n", targetSlot);
  
  // Instantly alert the cloud API to record event in Postgres
  sendDispenseToCloud(targetSlot);
}

// ─────────────────────────────────────────────────────────
// WiFi + Setup
// ─────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    macAddress = WiFi.macAddress();
    Serial.println("\n[WiFi] Connected! IP: " + WiFi.localIP().toString());
    Serial.println("[WiFi] MAC Address: " + macAddress);
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);
    Serial.println("[NTP] Time synchronized.");
  } else {
    Serial.println("\n[WiFi] FAILED.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Weekly Pill Dispenser - Cloud Edition Starting ===");

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  releaseStepper();

  connectWiFi();

  Serial.println("[System] Ready.");
}

// ─────────────────────────────────────────────────────────
// Main Loop
// ─────────────────────────────────────────────────────────
unsigned long lastCheck     = 0;
unsigned long lastPing      = 0;

void loop() {
  // Reconnect WiFi if lost
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Lost, reconnecting...");
    connectWiFi();
    delay(5000);
    return;
  }

  unsigned long now = millis();

  // Send a ping every 10 seconds to keep the Cloud API dashboard green!
  if (now - lastPing > 10000) {
    lastPing = now;
    sendPingTrigger();
  }

  // Check automated schedule every 30 seconds
  if (now - lastCheck > 30000) {
    lastCheck = now;

    struct tm timeInfo;
    if (!getLocalTime(&timeInfo)) {
      Serial.println("[NTP] Failed to get time");
      return;
    }

    int currentHour   = timeInfo.tm_hour;
    int currentMinute = timeInfo.tm_min;
    int currentWday   = timeInfo.tm_wday;

    for (int s = 0; s < 3; s++) {
      if (currentHour   == schedule[s].hour &&
          currentMinute == schedule[s].minute) {

        if (!(lastDispensedHour == currentHour && lastDispensedDay == currentWday)) {
          int dayIndex   = getDayIndex(currentWday);
          int targetSlot = getTargetSlot(dayIndex, s);

          Serial.printf("[Schedule] Auto-dispense: day=%d session=%d slot=%d\n",
                        dayIndex, s, targetSlot);

          dispense(targetSlot, dayIndex, s);
          
          lastDispensedHour = currentHour;
          lastDispensedDay  = currentWday;
        }
        break;
      }
    }
  }
}