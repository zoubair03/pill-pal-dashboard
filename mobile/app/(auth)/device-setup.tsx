import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, FlatList
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useBLE } from '@/hooks/useBLE'
import { useSupabase } from '@/hooks/useSupabase'
import type { Device } from 'react-native-ble-plx'

type Step = 'scan' | 'wifi' | 'provisioning' | 'register' | 'done'

export default function DeviceSetupScreen() {
  const router                = useRouter()
  const ble                   = useBLE()
  const { registerDevice }    = useSupabase()

  const [step,         setStep]         = useState<Step>('scan')
  const [ssid,         setSsid]         = useState('')
  const [wifiPass,     setWifiPass]     = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [regLoading,   setRegLoading]   = useState(false)

  // ── Step 1: Scan & Connect ─────────────────────────────────────────────────
  const handleConnect = async (device: Device) => {
    await ble.connect(device)
    setStep('wifi')
  }

  // ── Step 2: Enter WiFi & Provision ────────────────────────────────────────
  const handleProvision = async () => {
    if (!ssid.trim()) { Alert.alert('Error', 'Please enter your WiFi network name.'); return }
    await ble.provision(ssid.trim(), wifiPass)
    setStep('provisioning')
  }

  // Watch for BLE success → go to register step
  if (step === 'provisioning' && ble.status === 'success') {
    // Extract serial from device name e.g. "PillPal-SN-A1B2C3"
    const name = ble.selectedDevice?.name ?? ''
    const sn   = name.replace('PillPal-', '')
    if (sn && !serialNumber) setSerialNumber(sn)
    // eslint-disable-next-line react-hooks/rules-of-hooks — intentional
    setTimeout(() => setStep('register'), 500)
  }

  // ── Step 3: Register device to account ────────────────────────────────────
  const handleRegister = async () => {
    if (!serialNumber.trim()) { Alert.alert('Error', 'Please enter the device serial number.'); return }
    setRegLoading(true)
    const { error } = await registerDevice(serialNumber.trim())
    setRegLoading(false)
    if (error) { Alert.alert('Error', String(error)); return }
    setStep('done')
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ fontSize: 72 }}>✅</Text>
        <Text style={styles.doneTitle}>Device Ready!</Text>
        <Text style={styles.doneSubtitle}>
          Your PillPal dispenser is connected and registered.
        </Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.btnText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.step}>Step 2 of 2</Text>
        <Text style={styles.title}>Connect Device</Text>
        <Text style={styles.subtitle}>Set up your PillPal dispenser via Bluetooth</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={styles.progressDot} />
        <View style={styles.progressLine} />
        <View style={[styles.progressDot, styles.progressActive]} />
      </View>

      {/* ── SCAN STEP ─────────────────────────────────────────────────────── */}
      {step === 'scan' && (
        <View style={styles.section}>
          <Text style={styles.instruction}>
            Make sure your PillPal device is powered on and in provisioning mode (LED should be blinking blue).
          </Text>

          <TouchableOpacity
            style={[styles.btn, ble.status === 'scanning' && styles.btnDisabled]}
            onPress={ble.scan}
            disabled={ble.status === 'scanning'}
          >
            {ble.status === 'scanning'
              ? <><ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>Scanning...</Text></>
              : <><Ionicons name="bluetooth" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.btnText}>Scan for Devices</Text></>
            }
          </TouchableOpacity>

          <Text style={styles.statusMsg}>{ble.statusMessage}</Text>

          {/* Device list */}
          {ble.foundDevices.length > 0 && (
            <View style={styles.deviceList}>
              <Text style={styles.sectionLabel}>Found Devices</Text>
              {ble.foundDevices.map(device => (
                <TouchableOpacity
                  key={device.id}
                  style={styles.deviceRow}
                  onPress={() => handleConnect(device)}
                >
                  <Ionicons name="hardware-chip" size={22} color="#6366f1" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.deviceName}>{device.name ?? 'Unknown'}</Text>
                    <Text style={styles.deviceId}>{device.id}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#64748b" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {ble.foundDevices.length === 0 && ble.status === 'idle' && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📡</Text>
              <Text style={styles.emptyText}>No devices found yet. Tap Scan to search.</Text>
            </View>
          )}

          {/* Skip BLE — manual serial entry */}
          <TouchableOpacity style={styles.skipLink} onPress={() => setStep('register')}>
            <Text style={styles.skipText}>Skip Bluetooth → Enter serial number manually</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── WIFI STEP ─────────────────────────────────────────────────────── */}
      {step === 'wifi' && (
        <View style={styles.section}>
          <View style={styles.connectedBadge}>
            <Ionicons name="bluetooth" size={16} color="#6366f1" />
            <Text style={styles.connectedText}>
              Connected to {ble.selectedDevice?.name}
            </Text>
          </View>

          <Text style={styles.instruction}>
            Enter your home WiFi credentials. The dispenser needs WiFi to sync with the cloud.
          </Text>

          <Text style={styles.label}>WiFi Network Name (SSID)</Text>
          <TextInput
            style={styles.input}
            placeholder="MyHomeWiFi"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            value={ssid}
            onChangeText={setSsid}
          />

          <Text style={styles.label}>WiFi Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={wifiPass}
            onChangeText={setWifiPass}
          />

          <TouchableOpacity style={styles.btn} onPress={handleProvision}>
            <Ionicons name="wifi" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Send to Device</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => { ble.disconnect(); setStep('scan') }}>
            <Text style={styles.backText}>← Back to scan</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── PROVISIONING ──────────────────────────────────────────────────── */}
      {step === 'provisioning' && (
        <View style={[styles.section, styles.center]}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.waitTitle}>Connecting...</Text>
          <Text style={styles.statusMsg}>{ble.statusMessage}</Text>
          {ble.status === 'error' && (
            <TouchableOpacity style={styles.btnOutline} onPress={() => setStep('wifi')}>
              <Text style={styles.btnOutlineText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── REGISTER STEP ─────────────────────────────────────────────────── */}
      {step === 'register' && (
        <View style={styles.section}>
          <Text style={styles.instruction}>
            Enter the serial number printed on the bottom of your PillPal device.
          </Text>
          <Text style={styles.label}>Serial Number</Text>
          <TextInput
            style={[styles.input, styles.inputMono]}
            placeholder="SN-A1B2C3"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            value={serialNumber}
            onChangeText={setSerialNumber}
          />
          <TouchableOpacity
            style={[styles.btn, regLoading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={regLoading}
          >
            {regLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Register Device</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0f172a' },
  inner:          { paddingHorizontal: 24, paddingVertical: 56 },
  center:         { alignItems: 'center', justifyContent: 'center', flex: 1 },
  header:         { marginBottom: 28 },
  step:           { fontSize: 12, fontWeight: '700', color: '#6366f1', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  title:          { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 8 },
  subtitle:       { fontSize: 14, color: '#64748b', lineHeight: 20 },
  progressRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  progressDot:    { width: 12, height: 12, borderRadius: 6, backgroundColor: '#334155' },
  progressActive: { backgroundColor: '#6366f1' },
  progressLine:   { flex: 1, height: 2, backgroundColor: '#334155', marginHorizontal: 6 },
  section:        { gap: 14 },
  instruction:    { fontSize: 14, color: '#94a3b8', lineHeight: 22, marginBottom: 4 },
  btn:            {
    backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center',
  },
  btnDisabled:    { opacity: 0.6 },
  btnText:        { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnOutline:     {
    borderWidth: 1, borderColor: '#6366f1', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 24, marginTop: 12
  },
  btnOutlineText: { color: '#818cf8', fontWeight: '600', fontSize: 15 },
  statusMsg:      { fontSize: 13, color: '#64748b', textAlign: 'center' },
  label:          { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  input:          {
    backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    borderWidth: 1, borderColor: '#334155',
  },
  inputMono:      { fontFamily: 'monospace', letterSpacing: 2 },
  sectionLabel:   { fontSize: 12, fontWeight: '700', color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' },
  deviceList:     { gap: 8 },
  deviceRow:      {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#334155',
  },
  deviceName:     { fontSize: 15, fontWeight: '600', color: '#f8fafc' },
  deviceId:       { fontSize: 11, color: '#64748b', marginTop: 2 },
  emptyState:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyIcon:      { fontSize: 36 },
  emptyText:      { fontSize: 13, color: '#64748b', textAlign: 'center' },
  skipLink:       { alignItems: 'center', paddingVertical: 8 },
  skipText:       { fontSize: 13, color: '#6366f1' },
  backLink:       { alignItems: 'center' },
  backText:       { fontSize: 13, color: '#64748b' },
  connectedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#334155'
  },
  connectedText:  { fontSize: 13, color: '#818cf8', fontWeight: '600' },
  doneTitle:      { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginTop: 16, marginBottom: 8 },
  doneSubtitle:   { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  waitTitle:      { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginTop: 20, marginBottom: 8 },
})
