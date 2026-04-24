import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useSupabase } from '@/hooks/useSupabase'

// ── Guard: redirect based on auth state ─────────────────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading, profile, device } = useSupabase()
  const segments = useSegments()
  const router   = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuth = segments[0] === '(auth)'

    if (!session) {
      if (!inAuth) router.replace('/(auth)/login')
    } else if (!profile?.full_name) {
      if (segments[0] !== '(auth)' || segments[1] !== 'profile-setup')
        router.replace('/(auth)/profile-setup')
    } else if (!device) {
      if (segments[0] !== '(auth)' || segments[1] !== 'device-setup')
        router.replace('/(auth)/device-setup')
    } else {
      if (inAuth) router.replace('/(tabs)')
    }
  }, [session, loading, profile, device, segments])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)"  />
            <Stack.Screen name="(tabs)"  />
          </Stack>
        </AuthGuard>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
