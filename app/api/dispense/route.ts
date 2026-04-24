import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_KEY'
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { serial_number, slot_number } = body

    console.log(`[Dispense] SN=${serial_number} physical_slot=${slot_number}`)

    if (!serial_number || slot_number === undefined) {
      return NextResponse.json({ error: 'Missing serial_number or slot_number' }, { status: 400 })
    }

    // 1. Find device
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('id, owner_id')
      .eq('serial_number', serial_number)
      .single()

    if (deviceError || !device) {
      console.error('[Dispense] Device not found:', serial_number, deviceError?.message)
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // 2. Update device's current physical slot
    await supabaseAdmin
      .from('devices')
      .update({ current_slot: slot_number })
      .eq('id', device.id)

    // 3. Upsert medication_slot row for this physical slot
    //    Using upsert so we never get duplicate-key 500 errors
    const { error: slotError } = await supabaseAdmin
      .from('medication_slots')
      .upsert(
        {
          device_id:   device.id,
          slot_number: slot_number,
          is_dispensed: true,
          med_list:    []
        },
        { onConflict: 'device_id,slot_number' }
      )

    if (slotError) {
      console.error('[Dispense] Slot upsert failed:', slotError.message)
      // Non-fatal — still log the dispense event
    }

    // 4. Write to dispense_logs
    const { error: logError } = await supabaseAdmin
      .from('dispense_logs')
      .insert({
        device_id:      device.id,
        slot_number:    slot_number,
        session_type:   'automated',
        status:         'dispensed',
        meds_dispensed: []
      })

    if (logError) {
      console.error('[Dispense] Log insert failed:', logError.message)
      return NextResponse.json({ error: 'Failed to log dispense event' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Slot ${slot_number} dispensed.` })

  } catch (err) {
    console.error('[Dispense] Unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
