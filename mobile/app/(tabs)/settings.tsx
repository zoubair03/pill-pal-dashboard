import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSupabase } from '@/hooks/useSupabase'

export default function SettingsScreen() {
  const router = useRouter()
  const { profile, device, signOut, resetWeek } = useSupabase()
  const [resetting, setResetting] = useState(false)

  const handleReset = () => {
    Alert.alert(
      'Reset Week?',
      'This will mark all doses as pending and home all 3 wheels. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true)
            await resetWeek()
            setResetting(false)
            Alert.alert('Done', 'All slots have been reset.')
          }
        }
      ]
    )
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut }
    ])
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Patient info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle" size={40} color="#818cf8" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.cardTitle}>{profile?.full_name ?? '—'}</Text>
              <Text style={styles.cardSubtitle}>Patient Profile</Text>
            </View>
          </View>
          {profile?.birth_date && (
            <Row icon="calendar-outline" label="Date of Birth" value={profile.birth_date} />
          )}
          {profile?.phone_number && (
            <Row icon="call-outline" label="Phone" value={profile.phone_number} />
          )}
          {profile?.medication_list && profile.medication_list.length > 0 && (
            <Row icon="medkit-outline" label="Medications" value={profile.medication_list.join(', ')} />
          )}
        </View>

        {/* Device info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Device</Text>
          {device ? (
            <>
              <Row icon="hardware-chip-outline" label="Serial Number"  value={device.serial_number} />
              <Row icon="battery-half-outline"  label="Battery"        value={`${device.battery_level ?? '?'}%`} />
              <Row icon="time-outline"           label="Last Sync"      value={device.last_sync ? new Date(device.last_sync).toLocaleString() : '—'} />
            </>
          ) : (
            <Text style={styles.noDevice}>No device registered.</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity style={styles.actionRow} onPress={handleReset} disabled={resetting}>
            {resetting
              ? <ActivityIndicator size="small" color="#f43f5e" />
              : <Ionicons name="refresh-circle-outline" size={22} color="#f43f5e" />
            }
            <Text style={[styles.actionText, { color: '#f43f5e' }]}>Reset Week (home all wheels)</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color="#94a3b8" />
            <Text style={[styles.actionText, { color: '#94a3b8' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>PillPal Mobile v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon as any} size={16} color="#64748b" style={{ marginRight: 10 }} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#0f172a' },
  container:     { flex: 1 },
  inner:         { paddingHorizontal: 20, paddingBottom: 40 },
  pageTitle:     { fontSize: 28, fontWeight: '800', color: '#f8fafc', paddingTop: 24, marginBottom: 20 },
  card:          { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#334155' },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardTitle:     { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  cardSubtitle:  { fontSize: 12, color: '#64748b', marginTop: 2 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  row:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#0f172a' },
  rowLabel:      { fontSize: 13, color: '#64748b', flex: 1 },
  rowValue:      { fontSize: 13, color: '#f8fafc', fontWeight: '500', flex: 1, textAlign: 'right' },
  noDevice:      { fontSize: 13, color: '#64748b', fontStyle: 'italic' },
  actionRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  actionText:    { fontSize: 15, fontWeight: '600' },
  divider:       { height: 1, backgroundColor: '#0f172a' },
  version:       { textAlign: 'center', fontSize: 12, color: '#334155', marginTop: 8 },
})
