/*
  ============================================================
  PillPal — 3-WHEEL SYSTEM (Morning / Midday / Night)
  ============================================================
  Each wheel has 8 physical slots:
    Slot 0 = Home (free/empty slot)
    Slot 1 = Monday
    Slot 2 = Tuesday
    ...
    Slot 7 = Sunday

  Motor wiring (ULN2003 driver boards):
    Morning wheel : IN1=19, IN2=18, IN3=5,  IN4=17
    Midday  wheel : IN1=16, IN2=4,  IN3=2,  IN4=15
    Night   wheel : IN1=13, IN2=12, IN3=14, IN4=27
  ⚠️ Adjust pins to match your actual wiring!

  Libraries (Arduino Library Manager):
    - "PubSubClient" by Nick O'Leary
    - "ArduinoJson" by Benoit Blanchon
    - "WiFiManager" by tzapu (Captive Portal)
*/

#include "time.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>

// ── Configuration ─────────────────────────────────────────
const char *API_URL_DISPENSE = "https://pill-pal-dashboard.vercel.app/api/dispense";
const char *API_URL_PING     = "https://pill-pal-dashboard.vercel.app/api/ping";
const char *MQTT_BROKER      = "broker.hivemq.com";
const int   MQTT_PORT        = 1883;
const char *SERIAL_NUMBER    = "SN-A1B2C3";

// ── NTP Settings ──────────────────────────────────────────
const char *NTP_SERVER       = "pool.ntp.org";
const long  GMT_OFFSET_SEC   = 3600; // UTC+1 for Tunisia
const int   DAYLIGHT_OFFSET  = 0;

// ── Wheel & Motor Config ──────────────────────────────────
#define NUM_SLOTS       8          // 0=home, 1-7 = Mon-Sun
#define STEPS_PER_REV   4096
#define STEP_DELAY_US   1000
#define STEPS_PER_SLOT  (STEPS_PER_REV / NUM_SLOTS)

// Motor pins per wheel — ⚠️ Change to match your wiring!
const int PINS[3][4] = {
  {19, 18,  5, 17},   // [0] Morning
  {16,  4,  2, 15},   // [1] Midday  ← adjust
  {13, 12, 14, 27}    // [2] Night   ← adjust
};
const char *WHEEL_NAMES[3] = {"morning", "midday", "night"};

// Step sequence for 28BYJ-48 stepper (half-step)
const int STEP_SEQ[8][4] = {
  {1,0,0,0},{1,1,0,0},{0,1,0,0},{0,1,1,0},
  {0,0,1,0},{0,0,1,1},{0,0,0,1},{1,0,0,1}
};

// ── State ─────────────────────────────────────────────────
int wheelSlot[3] = {0, 0, 0};   // current physical position of each wheel

struct DispenseTime { int hour, minute; };
DispenseTime schedule[3] = { {9,0}, {13,0}, {20,0} };

int lastDispensedDay[3] = {-1, -1, -1};  // per-wheel: last day dispensed

WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ── Motor Helpers ─────────────────────────────────────────
void setPins(int wheel, int stepIdx) {
  for (int i = 0; i < 4; i++)
    digitalWrite(PINS[wheel][i], STEP_SEQ[stepIdx][i]);
}

void releasePins(int wheel) {
  for (int i = 0; i < 4; i++)
    digitalWrite(PINS[wheel][i], LOW);
}

void rotateSteps(int wheel, int steps) {
  static int stepIdx[3] = {0, 0, 0};
  for (int i = 0; i < steps; i++) {
    stepIdx[wheel] = (stepIdx[wheel] + 1) % 8;
    setPins(wheel, stepIdx[wheel]);
    delayMicroseconds(STEP_DELAY_US);
  }
  releasePins(wheel);
}

// Advance wheel to a target slot (0-7), shortest forward path
void advanceWheelToSlot(int wheel, int targetSlot) {
  int current = wheelSlot[wheel];
  int steps   = (targetSlot - current + NUM_SLOTS) % NUM_SLOTS;
  Serial.printf("[Motor] Wheel %s: %d → %d (%d steps)\n",
                WHEEL_NAMES[wheel], current, targetSlot, steps);
  rotateSteps(wheel, steps * STEPS_PER_SLOT);
  wheelSlot[wheel] = targetSlot;
}

// ── API Calls ─────────────────────────────────────────────
void sendDispenseLog(int wheelIdx, int daySlot) {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.begin(client, API_URL_DISPENSE);
  http.addHeader("Content-Type", "application/json");

  // Send wheel name + day slot (1-7 = Mon-Sun)
  String payload = "{\"serial_number\":\"" + String(SERIAL_NUMBER) + "\","
                   "\"wheel\":\"" + String(WHEEL_NAMES[wheelIdx]) + "\","
                   "\"slot_number\":" + String(daySlot) + "}";
  int code = http.POST(payload);
  Serial.printf("[Cloud Log] Dispense → %s slot %d (HTTP %d)\n",
                WHEEL_NAMES[wheelIdx], daySlot, code);
  http.end();
}

void sendHeartbeatAndSyncSchedule() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.begin(client, API_URL_PING);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"serial_number\":\"" + String(SERIAL_NUMBER) + "\"}";
  int code = http.POST(payload);

  if (code > 0) {
    Serial.printf("[Ping] OK (HTTP %d)\n", code);
    String response = http.getString();
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, response) && doc.containsKey("schedule")) {
      JsonArray arr = doc["schedule"];
      if (arr.size() == 3) {
        for (int i = 0; i < 3; i++) {
          schedule[i].hour   = arr[i]["hour"]   | schedule[i].hour;
          schedule[i].minute = arr[i]["minute"] | schedule[i].minute;
        }
      }
    }
  } else {
    Serial.printf("[Ping] FAILED (code %d)\n", code);
  }
  http.end();
}

// ── Dispense Logic ────────────────────────────────────────
// Returns day-of-week slot: Mon=1 ... Sun=7
int getTodaySlot() {
  struct tm t;
  if (!getLocalTime(&t)) return -1;
  // tm_wday: 0=Sunday, 1=Monday ... 6=Saturday → map to 1=Mon...7=Sun
  int dow = t.tm_wday; // 0=Sun
  return (dow == 0) ? 7 : dow; // Sun→7, Mon→1...Sat→6
}

int getCurrentHour()   { struct tm t; getLocalTime(&t); return t.tm_hour; }
int getCurrentMinute() { struct tm t; getLocalTime(&t); return t.tm_min; }
int getCurrentDay()    { struct tm t; getLocalTime(&t); return t.tm_yday; }

void checkAndDispense() {
  int todaySlot  = getTodaySlot();
  int curHour    = getCurrentHour();
  int curMinute  = getCurrentMinute();
  int todayOrdinal = getCurrentDay();

  if (todaySlot < 1) return; // NTP not ready

  for (int w = 0; w < 3; w++) {
    bool rightTime = (curHour   == schedule[w].hour &&
                      curMinute == schedule[w].minute);
    bool notYetDone = (lastDispensedDay[w] != todayOrdinal);

    if (rightTime && notYetDone) {
      Serial.printf("\n[SCHEDULE] Time for %s dose — advancing to slot %d (day %d)\n",
                    WHEEL_NAMES[w], todaySlot, todayOrdinal);
      advanceWheelToSlot(w, todaySlot);
      sendDispenseLog(w, todaySlot);
      lastDispensedDay[w] = todayOrdinal;
    }
  }
}

// ── MQTT ──────────────────────────────────────────────────
void mqttCallback(char *topic, byte *payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  Serial.printf("\n[MQTT] Received: %s\n", message.c_str());

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, message)) return;

  String action = doc["action"].as<String>();

  if (action == "dispense") {
    // Dashboard sends: {"action":"dispense","wheel":"morning","slot":3}
    String wheelName = doc["wheel"].as<String>();
    int    daySlot   = doc["slot"]  | getTodaySlot();

    int wheelIdx = -1;
    for (int w = 0; w < 3; w++) {
      if (wheelName == WHEEL_NAMES[w]) { wheelIdx = w; break; }
    }
    if (wheelIdx < 0) { Serial.println("[MQTT] Unknown wheel!"); return; }

    Serial.printf("[MQTT] Manual dispense: %s → slot %d\n",
                  WHEEL_NAMES[wheelIdx], daySlot);
    advanceWheelToSlot(wheelIdx, daySlot);
    sendDispenseLog(wheelIdx, daySlot);
  }

  if (action == "reset_wheel") {
    // {"action":"reset_wheel","wheel":"morning"}
    String wheelName = doc["wheel"].as<String>();
    for (int w = 0; w < 3; w++) {
      if (wheelName == WHEEL_NAMES[w]) {
        Serial.printf("[MQTT] Resetting %s wheel to home\n", WHEEL_NAMES[w]);
        advanceWheelToSlot(w, 0);
        break;
      }
    }
  }

  if (action == "reset_all") {
    Serial.println("[MQTT] Resetting ALL wheels to home");
    for (int w = 0; w < 3; w++) advanceWheelToSlot(w, 0);
  }
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting to broker.hivemq.com... ");
    String clientId = "PillPal-" + String(SERIAL_NUMBER);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("OK");
      String topic = "pillpal/cmd/" + String(SERIAL_NUMBER);
      mqttClient.subscribe(topic.c_str());
      Serial.printf("[MQTT] Subscribed to %s\n", topic.c_str());
    } else {
      Serial.printf("FAILED (rc=%d) — retry in 5s\n", mqttClient.state());
      delay(5000);
    }
  }
}

// ── Setup ─────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== PillPal 3-Wheel Dispenser Starting ===");

  // Init all motor pins
  for (int w = 0; w < 3; w++)
    for (int i = 0; i < 4; i++) {
      pinMode(PINS[w][i], OUTPUT);
      digitalWrite(PINS[w][i], LOW);
    }

  // WiFiManager captive portal
  WiFiManager wm;
  wm.setClass("invert");
  wm.setTitle("PillPal Setup");
  wm.setConfigPortalTimeout(180);

  // ⚠️ TEMPORARY: Delete the line below after WiFi connects successfully!
  wm.resetSettings();

  if (!wm.autoConnect("PillPal-Setup")) {
    Serial.println("[WiFi] Portal timed out. Restarting...");
    delay(3000);
    ESP.restart();
  }

  Serial.println("[WiFi] Connected! IP: " + WiFi.localIP().toString());

  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET, NTP_SERVER);
  Serial.println("[NTP] Clock synchronized.");

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  Serial.println("[System] Ready — 3 wheels standing by.");
}

// ── Loop ──────────────────────────────────────────────────
unsigned long lastPing     = 0;
unsigned long lastCheck    = 0;
const unsigned long PING_INTERVAL  = 10000;  // 10s heartbeat
const unsigned long CHECK_INTERVAL = 30000;  // 30s schedule check

void loop() {
  if (!mqttClient.connected()) reconnectMQTT();
  mqttClient.loop();

  unsigned long now = millis();

  if (now - lastPing > PING_INTERVAL) {
    lastPing = now;
    sendHeartbeatAndSyncSchedule();
  }

  if (now - lastCheck > CHECK_INTERVAL) {
    lastCheck = now;
    checkAndDispense();
  }
}