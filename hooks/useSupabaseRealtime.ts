import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useSupabaseRealtime(initialDeviceId?: string | null) {
  const [deviceId, setDeviceId] = useState<string | null>(initialDeviceId || null)
  const [dispensedSlots, setDispensedSlots] = useState<number[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [connected, setConnected] = useState(false)
  const defaultSchedule = [
    { hour: 9, minute: 0 },
    { hour: 13, minute: 0 },
    { hour: 20, minute: 0 }
  ]
  const [deviceMeta, setDeviceMeta] = useState({ 
    battery_level: 100, 
    current_slot: 0, 
    last_sync: new Date().toISOString(),
    schedule: defaultSchedule,
    serial_number: ""
  })
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    // 1. Authenticate user & find THEIR specific device!
    if (!deviceId) {
      const checkUserAndDevice = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          window.location.href = '/login'
          return
        }
        
        const { data } = await supabase.from('devices').select('id, battery_level, current_slot, last_sync, schedule, serial_number').eq('owner_id', session.user.id).limit(1)
        
        if (data && data.length > 0) {
          console.log("⚡ [HARDWARE] Connected to device with SN:", data[0].serial_number)
          setDeviceId(data[0].id)
          setDeviceMeta({ 
            battery_level: data[0].battery_level, 
            current_slot: data[0].current_slot, 
            last_sync: data[0].last_sync || new Date().toISOString(),
            schedule: (data[0] as any).schedule || defaultSchedule,
            serial_number: data[0].serial_number || ""
          })
        } else {
          // They are logged in, but don't own a device! Route them to pair one.
          window.location.href = '/setup'
        }
      }
      checkUserAndDevice()
      return
    }

    const fetchInitialData = async () => {
      const { data: dev } = await supabase.from('devices').select('*').eq('id', deviceId).single()
      if (dev) {
         setDeviceMeta(prev => ({ 
            ...prev,
            battery_level: dev.battery_level, 
            current_slot: dev.current_slot, 
            last_sync: dev.last_sync,
            schedule: dev.schedule || defaultSchedule,
            serial_number: dev.serial_number
         }))
         
         const { data: prof } = await supabase.from('profiles').select('*').eq('id', dev.owner_id).single()
         if (prof) {
           setProfile(prof)
         } else {
           // First login — upsert a blank profile row so the dashboard has something to display
           const { data: newProf } = await supabase
             .from('profiles')
             .upsert({ id: dev.owner_id, full_name: '', phone_number: '', birth_date: '2000-01-01', medication_list: [] })
             .select()
             .single()
           if (newProf) setProfile(newProf)
         }
      }

      // Fetch which slots are dropped (is_dispensed = true)
      const { data: slots } = await supabase.from('medication_slots').select('slot_number').eq('device_id', deviceId).eq('is_dispensed', true)
      if (slots) setDispensedSlots(slots.map(s => s.slot_number))

      // Build out recent history array from dispense_logs
      const { data: logs } = await supabase.from('dispense_logs').select('*').eq('device_id', deviceId).order('created_at', { ascending: false }).limit(5)
      if (logs) {
         setActivityLogs(logs.map(log => ({
            id: log.id,
            type: log.status, // e.g. 'dispensed'
            message: `Slot ${log.slot_number} dropped (${log.session_type || 'automated'})`,
            timeLabel: new Date(log.created_at).toLocaleTimeString()
         })))
      }
    }

    fetchInitialData()

    // Instantly react when the database is updated without reloading!
    const channel = supabase
      .channel(`device-${deviceId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'medication_slots', filter: `device_id=eq.${deviceId}` }, (payload) => {
          if (payload.new.is_dispensed) {
            setDispensedSlots(prev => prev.includes(payload.new.slot_number) ? prev : [...prev, payload.new.slot_number])
          } else {
            setDispensedSlots(prev => prev.filter(s => s !== payload.new.slot_number))
          }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dispense_logs', filter: `device_id=eq.${deviceId}` }, (payload) => {
          const log = payload.new
          const uiLog = {
             id: log.id,
             type: log.status,
             message: `Slot ${log.slot_number} dropped (${log.session_type || 'automated'})`,
             timeLabel: new Date(log.created_at).toLocaleTimeString()
          }
          setActivityLogs(prev => [uiLog, ...prev].slice(0, 5))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices', filter: `id=eq.${deviceId}` }, (payload) => {
          setDeviceMeta(prev => ({ 
            ...prev,
            battery_level: payload.new.battery_level, 
            current_slot: payload.new.current_slot, 
            last_sync: payload.new.last_sync,
            schedule: payload.new.schedule || defaultSchedule
          }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
          setProfile(payload.new)
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [deviceId])

  const resetWeek = async () => {
    await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial_number: deviceMeta.serial_number })
    })
  }

  const dispenseManual = async (slot_number: number) => {
    await fetch("/api/web_trigger", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ slot_number, serial_number: deviceMeta.serial_number })
    })
  }

  const updateProfile = async (updatedData: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase
      .from('profiles')
      .upsert({ id: session.user.id, ...updatedData })
  }

  const updateSchedule = async (newSchedule: any[]) => {
    if (deviceId) {
       await supabase.from('devices').update({ schedule: newSchedule }).eq('id', deviceId)
    }
  }

  return { connected, dispensedSlots, activityLogs, resetWeek, dispenseManual, deviceMeta, deviceId, profile, updateProfile, updateSchedule }
}
