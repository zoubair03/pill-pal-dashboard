// ── BLE Provisioning Hook ─────────────────────────────────────────────────────
// Scans for a PillPal ESP32, connects via BLE, and sends WiFi credentials.
//
// ESP32 BLE Service/Characteristic UUIDs (must match firmware):
//   Service  : 12345678-1234-5678-1234-56789abcdef0
//   SSID     : 12345678-1234-5678-1234-56789abcdef1  (Write)
//   Password : 12345678-1234-5678-1234-56789abcdef2  (Write)
//   Status   : 12345678-1234-5678-1234-56789abcdef3  (Notify)

import { useState, useCallback, useRef } from 'react'
import { Platform, PermissionsAndroid } from 'react-native'
import { BleManager, Device, State } from 'react-native-ble-plx'
import base64 from 'base64-js'

// UUIDs ── must match your ESP32 firmware ─────────────────────────────────────
export const BLE_SERVICE_UUID  = '12345678-1234-5678-1234-56789abcdef0'
export const BLE_SSID_UUID     = '12345678-1234-5678-1234-56789abcdef1'
export const BLE_PASS_UUID     = '12345678-1234-5678-1234-56789abcdef2'
export const BLE_STATUS_UUID   = '12345678-1234-5678-1234-56789abcdef3'

// ESP32 advertises this local name
const DEVICE_PREFIX = 'PillPal'

type BLEStatus =
  | 'idle'
  | 'requesting_permission'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'sending'
  | 'waiting_wifi'
  | 'success'
  | 'error'

interface UseBLEReturn {
  status:         BLEStatus
  statusMessage:  string
  foundDevices:   Device[]
  selectedDevice: Device | null
  scan:           () => Promise<void>
  connect:        (device: Device) => Promise<void>
  provision:      (ssid: string, password: string) => Promise<void>
  disconnect:     () => void
  reset:          () => void
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str)
  return base64.fromByteArray(bytes)
}

function fromBase64(b64: string): string {
  const bytes = base64.toByteArray(b64)
  return new TextDecoder().decode(bytes)
}

export function useBLE(): UseBLEReturn {
  const manager        = useRef(new BleManager()).current
  const [status, setStatus]               = useState<BLEStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('Ready to scan')
  const [foundDevices, setFoundDevices]   = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)

  // ── Android BLE permissions (Android 12+) ──────────────────────────────────
  const requestAndroidPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ])
      return Object.values(results).every(r => r === 'granted')
    }
    // Android < 12
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    )
    return result === 'granted'
  }, [])

  // ── Scan ───────────────────────────────────────────────────────────────────
  const scan = useCallback(async () => {
    setStatus('requesting_permission')
    setStatusMessage('Requesting Bluetooth permission...')
    setFoundDevices([])

    const granted = await requestAndroidPermissions()
    if (!granted) {
      setStatus('error')
      setStatusMessage('Bluetooth permission denied.')
      return
    }

    // Wait for BLE to be powered on
    const bleState = await manager.state()
    if (bleState !== State.PoweredOn) {
      setStatus('error')
      setStatusMessage('Bluetooth is off. Please enable it and try again.')
      return
    }

    setStatus('scanning')
    setStatusMessage('Scanning for PillPal devices...')
    const seen = new Set<string>()

    manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        setStatus('error')
        setStatusMessage(`Scan error: ${error.message}`)
        return
      }
      if (device?.name?.startsWith(DEVICE_PREFIX) && !seen.has(device.id)) {
        seen.add(device.id)
        setFoundDevices(prev => [...prev, device])
      }
    })

    // Stop scan after 10 seconds
    setTimeout(() => {
      manager.stopDeviceScan()
      setStatus(prev => (prev === 'scanning' ? 'idle' : prev))
      setStatusMessage(prev =>
        prev === 'Scanning for PillPal devices...'
          ? 'Scan complete.'
          : prev
      )
    }, 10000)
  }, [manager, requestAndroidPermissions])

  // ── Connect ────────────────────────────────────────────────────────────────
  const connect = useCallback(async (device: Device) => {
    manager.stopDeviceScan()
    setStatus('connecting')
    setStatusMessage(`Connecting to ${device.name ?? device.id}...`)

    try {
      const connected = await device.connect({ autoConnect: false })
      await connected.discoverAllServicesAndCharacteristics()
      setSelectedDevice(connected)
      setStatus('connected')
      setStatusMessage(`Connected to ${device.name ?? device.id}`)
    } catch (err: any) {
      setStatus('error')
      setStatusMessage(`Connection failed: ${err.message}`)
    }
  }, [manager])

  // ── Provision ──────────────────────────────────────────────────────────────
  const provision = useCallback(async (ssid: string, password: string) => {
    if (!selectedDevice) {
      setStatus('error')
      setStatusMessage('No device connected.')
      return
    }

    setStatus('sending')
    setStatusMessage('Sending WiFi credentials...')

    try {
      // Write SSID
      await selectedDevice.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID, BLE_SSID_UUID, toBase64(ssid)
      )
      // Write Password
      await selectedDevice.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID, BLE_PASS_UUID, toBase64(password)
      )

      setStatus('waiting_wifi')
      setStatusMessage('Credentials sent! Waiting for ESP32 to connect to WiFi...')

      // Subscribe to status notifications from ESP32
      selectedDevice.monitorCharacteristicForService(
        BLE_SERVICE_UUID, BLE_STATUS_UUID,
        (error, characteristic) => {
          if (error) return
          if (!characteristic?.value) return
          const msg = fromBase64(characteristic.value)
          if (msg.startsWith('CONNECTED')) {
            setStatus('success')
            setStatusMessage('✅ Device connected to WiFi successfully!')
          } else if (msg.startsWith('FAILED')) {
            setStatus('error')
            setStatusMessage('❌ WiFi connection failed. Check your credentials.')
          } else {
            setStatusMessage(msg)
          }
        }
      )
    } catch (err: any) {
      setStatus('error')
      setStatusMessage(`Failed to send credentials: ${err.message}`)
    }
  }, [selectedDevice])

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    selectedDevice?.cancelConnection()
    setSelectedDevice(null)
    setStatus('idle')
    setStatusMessage('Disconnected.')
  }, [selectedDevice])

  const reset = useCallback(() => {
    disconnect()
    setFoundDevices([])
    setStatus('idle')
    setStatusMessage('Ready to scan')
  }, [disconnect])

  return {
    status, statusMessage, foundDevices, selectedDevice,
    scan, connect, provision, disconnect, reset
  }
}
