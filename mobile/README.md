# PillPal Mobile App — BLE Branch

React Native (Expo) mobile app for PillPal with full BLE WiFi provisioning.

## Folder Structure
```
mobile/
  app/
    _layout.tsx              ← Root layout + auth guard
    (auth)/
      _layout.tsx
      login.tsx              ← Sign in
      register.tsx           ← Create account  
      profile-setup.tsx      ← Step 1: Patient info
      device-setup.tsx       ← Step 2: BLE scan + WiFi setup
    (tabs)/
      _layout.tsx
      index.tsx              ← Today's doses
      schedule.tsx           ← Weekly matrix
      settings.tsx           ← Profile, device, reset
  hooks/
    useBLE.ts                ← BLE scan / connect / provision
    useSupabase.ts           ← Auth, profile, device, realtime
  lib/
    supabase.ts              ← Supabase client
```

## Setup

### 1. Install dependencies
```bash
cd mobile
npm install
```

### 2. Configure Supabase
Edit `mobile/lib/supabase.ts` and replace:
```ts
const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON = 'YOUR_ANON_KEY'
```

### 3. Run
```bash
npx expo start
```
Scan the QR code with **Expo Go** (Android) or use a simulator.

> ⚠️ BLE does not work in Expo Go on iOS. Use a development build:
> ```bash
> npx expo run:ios
> ```

## BLE Provisioning Flow

```
[Phone]                          [ESP32]
  │                                 │
  │── Scan for "PillPal-SN-*" ────▶ │  Advertising via BLE
  │◀─ Found device ──────────────── │
  │── Connect ──────────────────── ▶│
  │── Write SSID (UUID_SSID) ──── ▶│
  │── Write Password (UUID_PASS) ─▶│
  │                                 │── WiFi.begin(ssid, pass)
  │◀─ Notify "CONNECTED:192.168.x"  │
  │                                 │── BLE stops, MQTT starts
```

## ESP32 Libraries Required
Install via Arduino Library Manager:
- `ArduinoJson` by Benoit Blanchon
- `PubSubClient` by Nick O'Leary  
- `ESP32 BLE Arduino` (built-in with ESP32 board package)

Remove `WiFiManager` — it's no longer used.
