import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(req: Request) {
  try {
    const { serial_number } = await req.json()

    if (!serial_number) {
      return NextResponse.json({ error: 'Missing serial_number' }, { status: 400 })
    }

    // Update heartbeat timestamp and get device info
    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .update({ last_sync: new Date().toISOString() })
      .eq('serial_number', serial_number)
      .select('id, schedule')
      .single()

    if (error || !device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Fetch dispensed slots per wheel for this week
    // slot_number 1-7 corresponds to Mon-Sun
    const { data: slots } = await supabaseAdmin
      .from('medication_slots')
      .select('wheel, slot_number')
      .eq('device_id', device.id)
      .eq('is_dispensed', true)

    // Group by wheel → { morning: [1,3], midday: [1], night: [] }
    const dispensed: Record<string, number[]> = {
      morning: [],
      midday:  [],
      night:   []
    }
    for (const slot of slots || []) {
      if (dispensed[slot.wheel] !== undefined) {
        dispensed[slot.wheel].push(slot.slot_number)
      }
    }

    return NextResponse.json({
      success:   true,
      schedule:  device.schedule,
      dispensed              // ESP32 uses this to know what's already done
    })

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
