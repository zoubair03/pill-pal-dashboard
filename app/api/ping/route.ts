import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(req: Request) {
  try {
    const { serial_number } = await req.json()
    
    if (!serial_number) {
      return NextResponse.json({ error: 'Missing serial_number' }, { status: 400 })
    }

    // Instantly update the last_sync timestamp so the dashboard shows "Hardware Connected"
    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .update({ last_sync: new Date().toISOString() })
      .eq('serial_number', serial_number)
      .select('schedule')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 })
    }

    return NextResponse.json({ success: true, schedule: device.schedule })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
