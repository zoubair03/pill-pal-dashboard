import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_KEY'
)

export async function POST(req: Request) {
  try {
    const { mac_address, battery_level } = await req.json()

    if (!mac_address) {
      return NextResponse.json({ error: 'Missing mac_address' }, { status: 400 })
    }

    const payload: any = { last_sync: new Date().toISOString() }
    if (battery_level !== undefined) {
      payload.battery_level = battery_level
    }

    const { data: dev } = await supabaseAdmin
      .from('devices')
      .update(payload)
      .eq('mac_address', mac_address)
      .select('current_slot, schedule')
      .single()

    if (!dev) {
      return NextResponse.json({ error: 'Failed to update device heartbeat' }, { status: 500 })
    }

    return NextResponse.json({ success: true, current_slot: dev.current_slot, schedule: dev.schedule })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
