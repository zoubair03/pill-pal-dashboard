/*
  ============================================================
  Weekly Pill Dispenser — EVENT DRIVEN MQTT CORE
  ============================================================
  Install via Arduino Library Manager:
    - "PubSubClient" by Nick O'Leary
    - "ArduinoJson" by Benoit Blanchon
*/

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>

// ── Configuration ─────────────────────────────────────────
const char* WIFI_SSID        = "mahdi";
const char* WIFI_PASSWORD    = "mahdi1818";
const char* API_URL_DISPENSE = "http://192.168.1.100:3000/api/dispense";
const char* MQTT_BROKER      = "broker.hivemq.com";
const int   MQTT_PORT        = 1883;

// ── Stepper Configuration ─────────────────────────────────
#define IN1 19
#define IN2 18
#define IN3  5
#define IN4 17

#define STEPS_PER_REV   4096
#define STEP_DELAY_US   1000
#define NUM_SLOTS       8    // Updated to 8 for the new triple-wheel design!
#define STEPS_PER_SLOT  (STEPS_PER_REV / NUM_SLOTS)

const int stepSequence[8][4] = {
  {1,0,0,0},{1,1,0,0},{0,1,0,0},{0,1,1,0},
  {0,0,1,0},{0,0,1,1},{0,0,0,1},{1,0,0,1}
};

// ── State ─────────────────────────────────────────────────
int  currentSlot       = 0;
String macAddress      = "";

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
// API Logger (Historical Data to Postgres Sync)
// ─────────────────────────────────────────────────────────
void sendDispenseLog(int slotValue) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(API_URL_DISPENSE);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"mac_address\":\"" + macAddress + "\",\"slot_number\":" + String(slotValue) + "}";
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
// MQTT Engine (Zero Latency)
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
    // Return hardware physically to Home Slot
    triggerReset();
  }
}

void reconnectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting to broker.hivemq.com... ");
    String clientId = "PillPal-" + String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("OK");
      String topicStr = String("pillpal/cmd/") + macAddress;
      mqttClient.subscribe(topicStr.c_str());
      Serial.printf("[MQTT] Subscribed to %s\n", topicStr.c_str());
    } else {
      Serial.print("FAILED (");
      Serial.print(mqttClient.state());
      Serial.println(") Trying again in 5s");
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

  // WiFi Connect
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  macAddress = WiFi.macAddress();
  Serial.println("\n[WiFi] Connected! MAC: " + macAddress);

  // MQTT Config
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  Serial.println("[System] Ready.");
}

void loop() {
  if (!mqttClient.connected()) reconnectMqtt();
  mqttClient.loop(); // Wait for ultra low-latency packets!
}