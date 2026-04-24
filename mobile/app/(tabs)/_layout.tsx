import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:       false,
        tabBarStyle:       { backgroundColor: '#0f172a', borderTopColor: '#1e293b', height: 72, paddingBottom: 10 },
        tabBarActiveTintColor:   '#818cf8',
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle:  { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) =>
            <Ionicons name="today" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) =>
            <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) =>
            <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
