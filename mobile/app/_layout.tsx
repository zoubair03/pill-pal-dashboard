import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSupabase } from '@/hooks/useSupabase'

// ── Auth Guard ────────────────────────────────────────────────────────────────
// Redirects the user based on session + profile + device state.
function AuthGuard() {
  const { session, loading, profile, device } = useSupabase()
  const segments = useSegments()
  const router   = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuth = segments[0] === '(auth)'

    if (!session) {
      // Not logged in → always go to login
      if (!inAuth) router.replace('/(auth)/login')

    } else if (!profile?.full_name) {
      // Logged in but no profile → profile setup
      router.replace('/(auth)/profile-setup')

    } else if (!device) {
      // Logged in + profile but no device → device setup
      router.replace('/(auth)/device-setup')

    } else {
      // Fully set up → main tabs
      if (inAuth) router.replace('/(tabs)')
    }
  }, [session, loading, profile, device])

  return null
}

// ── Root Layout ───────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
