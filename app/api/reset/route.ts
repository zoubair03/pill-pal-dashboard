import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_KEY'
)

export async function POST(req: Request) {
  try {
    const { mac_address } = await req.json()

    if (!mac_address) {
      return NextResponse.json({ error: 'Missing mac_address' }, { status: 400 })
    }

    const { data: device, error: devErr } = await supabaseAdmin
      .from('devices')
      .select('id')
      .eq('mac_address', mac_address)
      .single()

    if (devErr || !device) {
      return NextResponse.json({ error: 'Device not authorized or not found' }, { status: 404 })
    }

    // 1. Reset all slots for this week
    const { error: resetErr } = await supabaseAdmin
      .from('medication_slots')
      .update({ is_dispensed: false })
      .eq('device_id', device.id)

    // 2. Reset the device's current_slot motor status to 0 — do NOT touch last_sync
    await supabaseAdmin
      .from('devices')
      .update({ current_slot: 0 })
      .eq('id', device.id)

    if (resetErr) {
      return NextResponse.json({ error: 'Failed to reset slots' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'All slots reset to pending.' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
