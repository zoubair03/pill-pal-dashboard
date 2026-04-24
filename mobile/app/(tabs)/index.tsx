import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, RefreshControl
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useSupabase, type WheelName } from '@/hooks/useSupabase'

const WHEEL_CONFIG: Record<WheelName, { label: string; emoji: string; color: string; bg: string }> = {
  morning: { label: 'Morning',   emoji: '☀️',  color: '#f59e0b', bg: '#451a03' },
  midday:  { label: 'Midday',    emoji: '🌤️', color: '#38bdf8', bg: '#082f49' },
  night:   { label: 'Night',     emoji: '🌙',  color: '#818cf8', bg: '#1e1b4b' },
}

const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// Today = day-of-week mapped to slot 1=Mon...7=Sun
function todayDaySlot(): number {
  const dow = new Date().getDay() // 0=Sun
  return dow === 0 ? 7 : dow
}

function todayLabel(): string {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]
}

export default function TodayScreen() {
  const { profile, device, dispensedByWheel, dispense, refreshDevice } = useSupabase()
  const [dispensing, setDispensing] = useState<WheelName | null>(null)
  const [optimistic, setOptimistic] = useState<Record<WheelName, boolean>>({
    morning: false, midday: false, night: false
  })
  const [refreshing, setRefreshing] = useState(false)

  const daySlot = todayDaySlot()

  const isDispensed = (wheel: WheelName) =>
    optimistic[wheel] || (dispensedByWheel[wheel] ?? []).includes(daySlot)

  const handleDispense = async (wheel: WheelName) => {
    if (isDispensed(wheel)) {
      Alert.alert('Already Dispensed', `The ${wheel} dose for today was already dispensed.`)
      return
    }
    Alert.alert(
      'Confirm Dispense',
      `Dispense the ${WHEEL_CONFIG[wheel].label} dose now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Dispense',
          onPress: async () => {
            setDispensing(wheel)
            setOptimistic(prev => ({ ...prev, [wheel]: true }))
            const res = await dispense(wheel, daySlot)
            setDispensing(null)
            if (!res.ok) {
              setOptimistic(prev => ({ ...prev, [wheel]: false }))
              Alert.alert('Error', res.error ?? 'Could not reach device.')
            }
          }
        }
      ]
    )
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshDevice()
    setRefreshing(false)
  }

  const allDone  = (['morning','midday','night'] as WheelName[]).every(isDispensed)
  const doneCnt  = (['morning','midday','night'] as WheelName[]).filter(isDispensed).length
  const pct      = Math.round((doneCnt / 3) * 100)

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.inner}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#818cf8" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
            <Text style={styles.name}>{profile?.full_name ?? 'Patient'} 👋</Text>
          </View>
          <View style={[styles.badge, device ? styles.badgeOnline : styles.badgeOffline]}>
            <View style={[styles.dot, device ? styles.dotOnline : styles.dotOffline]} />
            <Text style={styles.badgeText}>{device ? 'Online' : 'No Device'}</Text>
          </View>
        </View>

        {/* Date & Progress */}
        <View style={styles.dateCard}>
          <Text style={styles.dateLabel}>{todayLabel()}</Text>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{doneCnt}/3 doses taken today</Text>
        </View>

        {/* Dose Cards */}
        <Text style={styles.sectionTitle}>Today's Doses</Text>
        {(Object.entries(WHEEL_CONFIG) as [WheelName, typeof WHEEL_CONFIG[WheelName]][]).map(([wheel, cfg]) => {
          const done    = isDispensed(wheel)
          const loading = dispensing === wheel
          return (
            <View key={wheel} style={[styles.doseCard, { backgroundColor: cfg.bg }]}>
              <View style={styles.doseLeft}>
                <Text style={styles.doseEmoji}>{cfg.emoji}</Text>
                <View>
                  <Text style={[styles.doseLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={styles.doseStatus}>
                    {done ? '✅ Dispensed' : '⏳ Pending'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.dispenseBtn,
                  done && styles.dispenseBtnDone,
                  { borderColor: cfg.color + '40', backgroundColor: cfg.color + (done ? '20' : '30') }
                ]}
                onPress={() => handleDispense(wheel)}
                disabled={done || loading}
              >
                {loading
                  ? <ActivityIndicator size="small" color={cfg.color} />
                  : <Ionicons
                      name={done ? 'checkmark-circle' : 'play-circle'}
                      size={22}
                      color={done ? '#10b981' : cfg.color}
                    />
                }
                <Text style={[styles.dispenseBtnText, { color: done ? '#10b981' : cfg.color }]}>
                  {done ? 'Done' : 'Dispense'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}

        {/* All done banner */}
        {allDone && (
          <View style={styles.allDone}>
            <Text style={{ fontSize: 32 }}>🎉</Text>
            <Text style={styles.allDoneTitle}>All doses taken!</Text>
            <Text style={styles.allDoneText}>Great job staying on track today.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#0f172a' },
  container:        { flex: 1 },
  inner:            { paddingHorizontal: 20, paddingBottom: 32 },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 20, marginBottom: 20 },
  greeting:         { fontSize: 14, color: '#64748b', fontWeight: '500' },
  name:             { fontSize: 22, fontWeight: '800', color: '#f8fafc', marginTop: 2 },
  badge:            { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  badgeOnline:      { backgroundColor: '#052e16', borderColor: '#166534' },
  badgeOffline:     { backgroundColor: '#1c1917', borderColor: '#44403c' },
  dot:              { width: 8, height: 8, borderRadius: 4 },
  dotOnline:        { backgroundColor: '#22c55e' },
  dotOffline:       { backgroundColor: '#78716c' },
  badgeText:        { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  dateCard:         { backgroundColor: '#1e293b', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  dateLabel:        { fontSize: 12, fontWeight: '700', color: '#6366f1', letterSpacing: 1, textTransform: 'uppercase' },
  dateText:         { fontSize: 20, fontWeight: '700', color: '#f8fafc', marginTop: 4, marginBottom: 14 },
  progressBar:      { height: 6, backgroundColor: '#0f172a', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill:     { height: '100%', backgroundColor: '#6366f1', borderRadius: 3 },
  progressLabel:    { fontSize: 13, color: '#64748b' },
  sectionTitle:     { fontSize: 16, fontWeight: '700', color: '#f8fafc', marginBottom: 12 },
  doseCard:         { borderRadius: 20, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#ffffff10' },
  doseLeft:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doseEmoji:        { fontSize: 32 },
  doseLabel:        { fontSize: 16, fontWeight: '700' },
  doseStatus:       { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  dispenseBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  dispenseBtnDone:  { opacity: 0.7 },
  dispenseBtnText:  { fontWeight: '700', fontSize: 13 },
  allDone:          { alignItems: 'center', paddingVertical: 32, gap: 8 },
  allDoneTitle:     { fontSize: 22, fontWeight: '800', color: '#f8fafc' },
  allDoneText:      { fontSize: 14, color: '#64748b' },
})
