import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { useSupabase } from '@/hooks/useSupabase'

export default function ProfileSetupScreen() {
  const { saveProfile } = useSupabase()
  const [fullName,   setFullName]   = useState('')
  const [birthDate,  setBirthDate]  = useState('')
  const [phone,      setPhone]      = useState('')
  const [loading,    setLoading]    = useState(false)

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert('Error', 'Full name is required.'); return }
    setLoading(true)
    const { error } = await saveProfile({
      full_name:       fullName.trim(),
      birth_date:      birthDate || undefined,
      phone_number:    phone.trim(),
      medication_list: [],
    })
    setLoading(false)
    if (error) Alert.alert('Error', String(error))
    // AuthGuard will redirect to device-setup automatically
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.step}>Step 1 of 2</Text>
        <Text style={styles.title}>Patient Profile</Text>
        <Text style={styles.subtitle}>Tell us about the patient this device is for</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={[styles.progressDot, styles.progressActive]} />
        <View style={styles.progressLine} />
        <View style={styles.progressDot} />
      </View>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Mohammed Ben Ali"
            placeholderTextColor="#64748b"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#64748b"
            value={birthDate}
            onChangeText={setBirthDate}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+216 XX XXX XXX"
            placeholderTextColor="#64748b"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Save & Continue →</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f172a' },
  inner:        { paddingHorizontal: 28, paddingVertical: 60 },
  header:       { marginBottom: 28 },
  step:         { fontSize: 12, fontWeight: '700', color: '#6366f1', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  title:        { fontSize: 28, fontWeight: '800', color: '#f8fafc', marginBottom: 8 },
  subtitle:     { fontSize: 14, color: '#64748b', lineHeight: 20 },
  progressRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
  progressDot:  { width: 12, height: 12, borderRadius: 6, backgroundColor: '#334155' },
  progressActive: { backgroundColor: '#6366f1' },
  progressLine: { flex: 1, height: 2, backgroundColor: '#334155', marginHorizontal: 6 },
  form:         { gap: 16 },
  field:        { gap: 6 },
  label:        { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  input:        {
    backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    borderWidth: 1, borderColor: '#334155',
  },
  btn:          {
    backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
  },
  btnDisabled:  { opacity: 0.6 },
  btnText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
})
