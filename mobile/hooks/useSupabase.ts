import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export type WheelName = 'morning' | 'midday' | 'night'

export interface DeviceMeta {
  id:            string
  serial_number: string
  battery_level: number
  last_sync:     string
  schedule:      { hour: number; minute: number }[]
  current_slot:  number
}

export interface PatientProfile {
  id:              string
  full_name:       string
  birth_date:      string
  phone_number:    string
  medication_list: string[]
}

export function useSupabase() {
  const [session,          setSession]          = useState<Session | null>(null)
  const [user,             setUser]             = useState<User | null>(null)
  const [profile,          setProfile]          = useState<PatientProfile | null>(null)
  const [device,           setDevice]           = useState<DeviceMeta | null>(null)
  const [dispensedByWheel, setDispensedByWheel] = useState<Record<WheelName, number[]>>({
    morning: [], midday: [], night: []
  })
  const [loading, setLoading] = useState(true)

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // ── Load profile + device when user is available ──────────────────────────
  useEffect(() => {
    if (!user) { setProfile(null); setDevice(null); return }
    loadProfile()
    loadDevice()
  }, [user])

  const loadProfile = async () => {
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (data) setProfile(data)
  }

  const loadDevice = async () => {
    if (!user) return
    const { data } = await supabase
      .from('devices')
      .select('*')
      .eq('owner_id', user.id)
      .single()
    if (data) {
      setDevice(data)
      loadDispensedSlots(data.id)
    }
  }

  const loadDispensedSlots = async (deviceId: string) => {
    const { data } = await supabase
      .from('medication_slots')
      .select('wheel, slot_number')
      .eq('device_id', deviceId)
      .eq('is_dispensed', true)

    const grouped: Record<WheelName, number[]> = { morning: [], midday: [], night: [] }
    for (const row of data ?? []) {
      if (grouped[row.wheel as WheelName]) grouped[row.wheel as WheelName].push(row.slot_number)
    }
    setDispensedByWheel(grouped)
  }

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!device?.id) return
    const channel = supabase
      .channel(`mobile-device-${device.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'medication_slots',
        filter: `device_id=eq.${device.id}`
      }, payload => {
        const s = payload.new as { wheel: WheelName; slot_number: number; is_dispensed: boolean }
        setDispensedByWheel(prev => {
          const updated = { ...prev }
          if (s.is_dispensed) {
            if (!updated[s.wheel].includes(s.slot_number))
              updated[s.wheel] = [...updated[s.wheel], s.slot_number]
          } else {
            updated[s.wheel] = updated[s.wheel].filter(n => n !== s.slot_number)
          }
          return updated
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'devices',
        filter: `id=eq.${device.id}`
      }, payload => {
        setDevice(prev => prev ? { ...prev, ...payload.new } : prev)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [device?.id])

  // ── Auth actions ──────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setDevice(null)
    setDispensedByWheel({ morning: [], midday: [], night: [] })
  }

  // ── Profile ───────────────────────────────────────────────────────────────
  const saveProfile = async (data: Partial<PatientProfile>) => {
    if (!user) return { error: 'Not logged in' }
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...data })
    if (!error) await loadProfile()
    return { error }
  }

  // ── Device registration ───────────────────────────────────────────────────
  const registerDevice = async (serialNumber: string) => {
    if (!user) return { error: 'Not logged in' }
    // Check device exists and isn't owned
    const { data: existing, error: findErr } = await supabase
      .from('devices')
      .select('id, owner_id')
      .eq('serial_number', serialNumber)
      .single()

    if (findErr || !existing) return { error: 'Device not found. Check the serial number.' }
    if (existing.owner_id && existing.owner_id !== user.id)
      return { error: 'This device is already registered to another account.' }

    const { error } = await supabase
      .from('devices')
      .update({ owner_id: user.id })
      .eq('id', existing.id)

    if (!error) await loadDevice()
    return { error }
  }

  // ── Dispense ──────────────────────────────────────────────────────────────
  const dispense = async (wheel: WheelName, daySlot: number) => {
    if (!device) return { ok: false, error: 'No device registered' }
    try {
      const res  = await fetch('https://pill-pal-dashboard.vercel.app/api/web_trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wheel, slot: daySlot, serial_number: device.serial_number })
      })
      const data = await res.json()
      return { ok: res.ok, ...data }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  }

  // ── Reset week ────────────────────────────────────────────────────────────
  const resetWeek = async () => {
    if (!device) return
    await fetch('https://pill-pal-dashboard.vercel.app/api/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial_number: device.serial_number })
    })
    setDispensedByWheel({ morning: [], midday: [], night: [] })
  }

  return {
    session, user, profile, device, dispensedByWheel, loading,
    signIn, signUp, signOut,
    saveProfile, registerDevice,
    dispense, resetWeek,
    refreshDevice: loadDevice,
  }
}
