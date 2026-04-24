/*
  ============================================================
  PillPal — 3-WHEEL SYSTEM with BLE WiFi Provisioning
  ============================================================
  BLE Provisioning Flow:
    1. On first boot (no WiFi saved), starts BLE server
    2. Mobile app scans, finds "PillPal-SN-XXXXX"
    3. App writes SSID to characteristic UUID_SSID
    4. App writes password to characteristic UUID_PASS
    5. ESP32 connects to WiFi, notifies status via UUID_STATUS
    6. BLE stops, MQTT starts as normal

  BLE UUIDs (must match mobile app):
    Service  : 12345678-1234-5678-1234-56789abcdef0
    SSID     : 12345678-1234-5678-1234-56789abcdef1
    Password : 12345678-1234-5678-1234-56789abcdef2
    Status   : 12345678-1234-5678-1234-56789abcdef3

  Motor wiring (ULN2003 driver boards):
    Morning  : IN1=19, IN2=18, IN3=5,  IN4=17
    Midday   : IN1=16, IN2=4,  IN3=2,  IN4=15
    Night    : IN1=13, IN2=12, IN3=14, IN4=27
*/

#include "time.h"
#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>      // ← replaces WiFiManager
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ── Configuration ─────────────────────────────────────────
const char *API_URL_DISPENSE = "https://pill-pal-dashboard.vercel.app/api/dispense";
const char *API_URL_PING     = "https://pill-pal-dashboard.vercel.app/api/ping";
const char *MQTT_BROKER      = "broker.hivemq.com";
const int   MQTT_PORT        = 1883;
const char *SERIAL_NUMBER    = "SN-A1B2C3";

// ── NTP ────────────────────────────────────────────────────
const char *NTP_SERVER      = "pool.ntp.org";
const long  GMT_OFFSET_SEC  = 3600;   // UTC+1 Tunisia
const int   DAYLIGHT_OFFSET = 0;

// ── BLE UUIDs ──────────────────────────────────────────────
#define BLE_SERVICE_UUID  "12345678-1234-5678-1234-56789abcdef0"
#define BLE_SSID_UUID     "12345678-1234-5678-1234-56789abcdef1"
#define BLE_PASS_UUID     "12345678-1234-5678-1234-56789abcdef2"
#define BLE_STATUS_UUID   "12345678-1234-5678-1234-56789abcdef3"

// ── Wheel & Motor Config ───────────────────────────────────
#define NUM_SLOTS       8
#define STEPS_PER_REV   4096
#define STEP_DELAY_US   1000
#define STEPS_PER_SLOT  (STEPS_PER_REV / NUM_SLOTS)

const int PINS[3][4] = {
  {19, 18,  5, 17},   // [0] Morning
  {16,  4,  2, 15},   // [1] Midday
  {13, 12, 14, 27}    // [2] Night
};
const char *WHEEL_NAMES[3] = {"morning", "midday", "night"};

const int STEP_SEQ[8][4] = {
  {1,0,0,0},{1,1,0,0},{0,1,0,0},{0,1,1,0},
  {0,0,1,0},{0,0,1,1},{0,0,0,1},{1,0,0,1}
};

// ── State ──────────────────────────────────────────────────
int wheelSlot[3]        = {0, 0, 0};
int lastDispensedDay[3] = {-1, -1, -1};
struct DispenseTime { int hour, minute; };
DispenseTime schedule[3] = { {9,0}, {13,0}, {20,0} };

WiFiClient    espClient;
PubSubClient  mqttClient(espClient);
Preferences   prefs;

// BLE globals
BLEServer             *bleServer      = nullptr;
BLECharacteristic     *statusChar     = nullptr;
bool                   bleProvisioning = false;
String                 pendingSsid, pendingPass;
bool                   wifiCredReceived = false;

// ── Motor Helpers ──────────────────────────────────────────
void setPins(int wheel, int stepIdx) {
  for (int i = 0; i < 4; i++)
    digitalWrite(PINS[wheel][i], STEP_SEQ[stepIdx][i]);
}

void releasePins(int wheel) {
  for (int i = 0; i < 4; i++) digitalWrite(PINS[wheel][i], LOW);
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

void advanceWheelToSlot(int wheel, int targetSlot) {
  int current = wheelSlot[wheel];
  int steps   = (targetSlot - current + NUM_SLOTS) % NUM_SLOTS;
  if (steps == 0) return;
  Serial.printf("[Motor] %s: %d → %d (%d steps)\n",
                WHEEL_NAMES[wheel], current, targetSlot, steps);
  rotateSteps(wheel, steps * STEPS_PER_SLOT);
  wheelSlot[wheel] = targetSlot;
}

// ── BLE Provisioning ───────────────────────────────────────
class SsidCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    pendingSsid = c->getValue().c_str();
    Serial.printf("[BLE] SSID received: %s\n", pendingSsid.c_str());
  }
};

class PassCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *c) override {
    pendingPass = c->getValue().c_str();
    Serial.println("[BLE] Password received");
    wifiCredReceived = true;   // trigger WiFi connect in loop()
  }
};

void startBLEProvisioning() {
  Serial.println("[BLE] Starting provisioning server...");
  String deviceName = String("PillPal-") + SERIAL_NUMBER;
  BLEDevice::init(deviceName.c_str());

  bleServer = BLEDevice::createServer();
  BLEService *svc = bleServer->createService(BLE_SERVICE_UUID);

  // SSID characteristic (Write)
  BLECharacteristic *ssidChar = svc->createCharacteristic(
    BLE_SSID_UUID, BLECharacteristic::PROPERTY_WRITE
  );
  ssidChar->setCallbacks(new SsidCallback());

  // Password characteristic (Write)
  BLECharacteristic *passChar = svc->createCharacteristic(
    BLE_PASS_UUID, BLECharacteristic::PROPERTY_WRITE
  );
  passChar->setCallbacks(new PassCallback());

  // Status characteristic (Notify)
  statusChar = svc->createCharacteristic(
    BLE_STATUS_UUID,
    BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ
  );
  statusChar->addDescriptor(new BLE2902());

  svc->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(BLE_SERVICE_UUID);
  adv->setScanResponse(true);
  adv->start();

  bleProvisioning = true;
  Serial.printf("[BLE] Advertising as \"%s\"\n", deviceName.c_str());
}

void bleNotifyStatus(const char *msg) {
  if (statusChar) {
    statusChar->setValue(msg);
    statusChar->notify();
    Serial.printf("[BLE] Notified: %s\n", msg);
  }
}

void stopBLE() {
  BLEDevice::stopAdvertising();
  bleProvisioning = false;
  Serial.println("[BLE] Stopped.");
}

// Try connecting with received credentials
bool tryConnectWiFi(const String &ssid, const String &pass) {
  Serial.printf("[WiFi] Connecting to: %s\n", ssid.c_str());
  bleNotifyStatus("CONNECTING");
  WiFi.begin(ssid.c_str(), pass.c_str());

  for (int i = 0; i < 30; i++) {   // 15 second timeout
    if (WiFi.status() == WL_CONNECTED) {
      String ip = WiFi.localIP().toString();
      Serial.printf("[WiFi] Connected! IP: %s\n", ip.c_str());
      // Persist credentials
      prefs.begin("wifi", false);
      prefs.putString("ssid", ssid);
      prefs.putString("pass", pass);
      prefs.end();
      String msg = "CONNECTED:" + ip;
      bleNotifyStatus(msg.c_str());
      return true;
    }
    delay(500);
  }
  bleNotifyStatus("FAILED:Wrong password or SSID");
  Serial.println("[WiFi] Connection failed.");
  return false;
}

// ── API Calls ──────────────────────────────────────────────
void sendDispenseLog(int wheelIdx, int daySlot) {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  http.begin(client, API_URL_DISPENSE);
  http.addHeader("Content-Type", "application/json");
  String payload = "{\"serial_number\":\"" + String(SERIAL_NUMBER) + "\","
                   "\"wheel\":\""           + String(WHEEL_NAMES[wheelIdx]) + "\","
                   "\"slot_number\":"       + String(daySlot) + "}";
  int code = http.POST(payload);
  Serial.printf("[Cloud] Dispense %s slot %d → HTTP %d\n",
                WHEEL_NAMES[wheelIdx], daySlot, code);
  http.end();
}

void sendHeartbeatAndSyncSchedule() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  http.begin(client, API_URL_PING);
  http.addHeader("Content-Type", "application/json");
  String payload = "{\"serial_number\":\"" + String(SERIAL_NUMBER) + "\"}";
  int code = http.POST(payload);
  if (code > 0) {
    Serial.printf("[Ping] HTTP %d\n", code);
    String resp = http.getString();
    StaticJsonDocument<512> doc;
    if (!deserializeJson(doc, resp) && doc.containsKey("schedule")) {
      JsonArray arr = doc["schedule"];
      if (arr.size() == 3)
        for (int i = 0; i < 3; i++) {
          schedule[i].hour   = arr[i]["hour"]   | schedule[i].hour;
          schedule[i].minute = arr[i]["minute"] | schedule[i].minute;
        }
    }
  } else {
    Serial.printf("[Ping] FAILED (%d)\n", code);
  }
  http.end();
}

// ── Dispense Logic ─────────────────────────────────────────
int getTodaySlot() {
  struct tm t;
  if (!getLocalTime(&t)) return -1;
  return (t.tm_wday == 0) ? 7 : t.tm_wday;
}

int getCurrentHour()    { struct tm t; getLocalTime(&t); return t.tm_hour; }
int getCurrentMinute()  { struct tm t; getLocalTime(&t); return t.tm_min;  }
int getCurrentDay()     { struct tm t; getLocalTime(&t); return t.tm_yday; }

void checkAndDispense() {
  int todaySlot    = getTodaySlot();
  int curHour      = getCurrentHour();
  int curMinute    = getCurrentMinute();
  int todayOrdinal = getCurrentDay();
  if (todaySlot < 1) return;

  for (int w = 0; w < 3; w++) {
    bool rightTime  = (curHour == schedule[w].hour && curMinute == schedule[w].minute);
    bool notYetDone = (lastDispensedDay[w] != todayOrdinal);
    if (rightTime && notYetDone) {
      Serial.printf("[SCHEDULE] %s dose → slot %d\n", WHEEL_NAMES[w], todaySlot);
      advanceWheelToSlot(w, todaySlot);
      sendDispenseLog(w, todaySlot);
      lastDispensedDay[w] = todayOrdinal;
    }
  }
}

// ── MQTT ───────────────────────────────────────────────────
void mqttCallback(char *topic, byte *payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  Serial.printf("[MQTT] Received: %s\n", message.c_str());

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, message)) return;
  String action = doc["action"].as<String>();

  if (action == "dispense") {
    String wheelName = doc["wheel"].as<String>();
    int    daySlot   = doc["slot"] | getTodaySlot();
    int wheelIdx = -1;
    for (int w = 0; w < 3; w++)
      if (wheelName == WHEEL_NAMES[w]) { wheelIdx = w; break; }
    if (wheelIdx < 0) { Serial.println("[MQTT] Unknown wheel!"); return; }
    advanceWheelToSlot(wheelIdx, daySlot);
    sendDispenseLog(wheelIdx, daySlot);
  }

  if (action == "reset_all") {
    Serial.println("[MQTT] Resetting ALL wheels to home");
    for (int w = 0; w < 3; w++) {
      advanceWheelToSlot(w, 0);
      lastDispensedDay[w] = -1;
    }
  }

  if (action == "reset_wheel") {
    String wheelName = doc["wheel"].as<String>();
    for (int w = 0; w < 3; w++) {
      if (wheelName == WHEEL_NAMES[w]) {
        advanceWheelToSlot(w, 0);
        lastDispensedDay[w] = -1;
        break;
      }
    }
  }
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting... ");
    String clientId = "PillPal-" + String(SERIAL_NUMBER);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("OK");
      String topic = "pillpal/cmd/" + String(SERIAL_NUMBER);
      mqttClient.subscribe(topic.c_str());
    } else {
      Serial.printf("FAILED (rc=%d) — retry 5s\n", mqttClient.state());
      delay(5000);
    }
  }
}

// ── Setup ──────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== PillPal 3-Wheel Dispenser ===");

  // Init motor pins
  for (int w = 0; w < 3; w++)
    for (int i = 0; i < 4; i++) {
      pinMode(PINS[w][i], OUTPUT);
      digitalWrite(PINS[w][i], LOW);
    }

  // Load saved WiFi credentials
  prefs.begin("wifi", true);
  String savedSsid = prefs.getString("ssid", "");
  String savedPass = prefs.getString("pass", "");
  prefs.end();

  if (savedSsid.length() > 0) {
    // ── Normal boot: connect with saved credentials ────────
    Serial.printf("[WiFi] Connecting to saved network: %s\n", savedSsid.c_str());
    WiFi.begin(savedSsid.c_str(), savedPass.c_str());
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
      delay(500); attempts++;
      Serial.print(".");
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
      Serial.println("\n[WiFi] Failed — starting BLE provisioning...");
      startBLEProvisioning();
      return;
    }
  } else {
    // ── First boot: no credentials → BLE provisioning ─────
    Serial.println("[WiFi] No saved credentials — starting BLE provisioning...");
    startBLEProvisioning();
    return;
  }

  // Post-WiFi init
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET, NTP_SERVER);
  Serial.println("[NTP] Synchronized");
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  Serial.println("[System] Ready — 3 wheels standing by.");
}

// ── Loop ───────────────────────────────────────────────────
unsigned long lastPing  = 0, lastCheck = 0;
const unsigned long PING_INTERVAL  = 10000;
const unsigned long CHECK_INTERVAL = 30000;

void loop() {
  // ── BLE provisioning mode ─────────────────────────────
  if (bleProvisioning) {
    if (wifiCredReceived) {
      wifiCredReceived = false;
      bool ok = tryConnectWiFi(pendingSsid, pendingPass);
      if (ok) {
        delay(1500);   // let notify arrive
        stopBLE();
        configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET, NTP_SERVER);
        Serial.println("[NTP] Synchronized");
        mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
        mqttClient.setCallback(mqttCallback);
        Serial.println("[System] Ready — 3 wheels standing by.");
      }
    }
    return;
  }

  // ── Normal operational mode ───────────────────────────
  if (!mqttClient.connected()) reconnectMQTT();
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastPing > PING_INTERVAL)   { lastPing  = now; sendHeartbeatAndSyncSchedule(); }
  if (now - lastCheck > CHECK_INTERVAL) { lastCheck = now; checkAndDispense(); }
}