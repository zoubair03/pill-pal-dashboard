import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSupabase } from '@/hooks/useSupabase'

export default function RegisterScreen() {
  const router       = useRouter()
  const { signUp }   = useSupabase()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleRegister = async () => {
    if (!email || !password || !confirm) {
      Alert.alert('Error', 'Please fill in all fields.'); return
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match.'); return
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.'); return
    }
    setLoading(true)
    const { error } = await signUp(email.trim(), password)
    setLoading(false)
    if (error) {
      Alert.alert('Registration Failed', error.message)
    } else {
      // AuthGuard will push to profile-setup after email confirmation
      Alert.alert('Account created!', 'Please check your email to confirm your account, then sign in.')
      router.replace('/(auth)/login')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>💊</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join PillPal today</Text>
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
            placeholder="At least 6 characters"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Repeat password"
            placeholderTextColor="#64748b"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => router.back()}>
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0f172a' },
  inner:      { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  header:     { alignItems: 'center', marginBottom: 36 },
  logo:       { fontSize: 48, marginBottom: 8 },
  title:      { fontSize: 28, fontWeight: '800', color: '#f8fafc' },
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
