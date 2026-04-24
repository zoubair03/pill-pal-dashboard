import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSupabase } from '@/hooks/useSupabase'

export default function LoginScreen() {
  const router         = useRouter()
  const { signIn }     = useSupabase()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Please fill in all fields.'); return }
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) Alert.alert('Login Failed', error.message)
    // On success, AuthGuard will redirect
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>💊</Text>
        <Text style={styles.title}>PillPal</Text>
        <Text style={styles.subtitle}>Smart Medication Dispenser</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#64748b"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign In</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkBold}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', paddingHorizontal: 28 },
  header:     { alignItems: 'center', marginBottom: 40 },
  logo:       { fontSize: 56, marginBottom: 8 },
  title:      { fontSize: 32, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5 },
  subtitle:   { fontSize: 14, color: '#64748b', marginTop: 4 },
  form:       { gap: 12 },
  label:      { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: -6 },
  input:      {
    backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    borderWidth: 1, borderColor: '#334155',
  },
  btn:        {
    backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:    { color: '#fff', fontWeight: '700', fontSize: 16 },
  link:       { alignItems: 'center', marginTop: 8 },
  linkText:   { color: '#64748b', fontSize: 14 },
  linkBold:   { color: '#818cf8', fontWeight: '700' },
})
