import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useSupabase, type WheelName } from '@/hooks/useSupabase'

const DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const WHEELS: WheelName[] = ['morning','midday','night']
const WHEEL_ICONS: Record<WheelName, string> = { morning: '☀️', midday: '🌤️', night: '🌙' }

// todayIndex 0=Mon...6=Sun
function todayIndex(): number {
  const dow = new Date().getDay() // 0=Sun
  return dow === 0 ? 6 : dow - 1
}

export default function ScheduleScreen() {
  const { dispensedByWheel, dispense } = useSupabase()
  const today = todayIndex()

  const isDispensed = (wheel: WheelName, dayIdx: number) =>
    (dispensedByWheel[wheel] ?? []).includes(dayIdx + 1) // slot 1-7

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Schedule</Text>
          <Text style={styles.subtitle}>Tap a pending dose to dispense manually</Text>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Dispensed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#334155' }]} />
            <Text style={styles.legendText}>Pending</Text>
          </View>
        </View>

        {/* Matrix: rows = days, cols = wheels */}
        <View style={styles.matrix}>
          {/* Column headers */}
          <View style={styles.matrixHeader}>
            <View style={styles.dayLabelCol} />
            {WHEELS.map(w => (
              <View key={w} style={styles.wheelCol}>
                <Text style={styles.wheelEmoji}>{WHEEL_ICONS[w]}</Text>
                <Text style={styles.wheelLabel}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Day rows */}
          {DAYS.map((day, dayIdx) => (
            <View
              key={day}
              style={[styles.matrixRow, dayIdx === today && styles.matrixRowToday]}
            >
              <View style={styles.dayLabelCol}>
                <Text style={[styles.dayLabel, dayIdx === today && styles.dayLabelToday]}>
                  {day}
                </Text>
                {dayIdx === today && <Text style={styles.todayBadge}>today</Text>}
              </View>

              {WHEELS.map(wheel => {
                const done = isDispensed(wheel, dayIdx)
                return (
                  <TouchableOpacity
                    key={wheel}
                    style={styles.wheelCol}
                    onPress={() => !done && dispense(wheel, dayIdx + 1)}
                    activeOpacity={done ? 1 : 0.7}
                  >
                    <View style={[styles.cell, done ? styles.cellDone : styles.cellPending]}>
                      {done
                        ? <Ionicons name="checkmark" size={16} color="#10b981" />
                        : <View style={styles.cellEmpty} />
                      }
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#0f172a' },
  container:        { flex: 1 },
  inner:            { paddingHorizontal: 20, paddingBottom: 40 },
  header:           { paddingTop: 24, marginBottom: 16 },
  title:            { fontSize: 26, fontWeight: '800', color: '#f8fafc' },
  subtitle:         { fontSize: 13, color: '#64748b', marginTop: 4 },
  legend:           { flexDirection: 'row', gap: 20, marginBottom: 20 },
  legendItem:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:        { width: 10, height: 10, borderRadius: 5 },
  legendText:       { fontSize: 12, color: '#94a3b8' },
  matrix:           { backgroundColor: '#1e293b', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  matrixHeader:     { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155', backgroundColor: '#0f172a' },
  matrixRow:        { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  matrixRowToday:   { backgroundColor: '#1e1b4b' },
  dayLabelCol:      { width: 56, paddingLeft: 16, justifyContent: 'center' },
  dayLabel:         { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  dayLabelToday:    { color: '#818cf8' },
  todayBadge:       { fontSize: 9, color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  wheelCol:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wheelEmoji:       { fontSize: 18 },
  wheelLabel:       { fontSize: 9, color: '#64748b', textTransform: 'capitalize', marginTop: 2 },
  cell:             { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cellDone:         { backgroundColor: '#052e16', borderWidth: 1, borderColor: '#166534' },
  cellPending:      { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  cellEmpty:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#334155' },
})
