import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const VALID_WHEELS = ['morning', 'midday', 'night']

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { serial_number, wheel, slot_number } = body

    console.log(`[Dispense] SN=${serial_number} wheel=${wheel} slot=${slot_number}`)

    if (!serial_number || !wheel || slot_number === undefined) {
      return NextResponse.json({ error: 'Missing serial_number, wheel, or slot_number' }, { status: 400 })
    }

    if (!VALID_WHEELS.includes(wheel)) {
      return NextResponse.json({ error: `Invalid wheel. Must be one of: ${VALID_WHEELS.join(', ')}` }, { status: 400 })
    }

    // 1. Find device
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('id, owner_id')
      .eq('serial_number', serial_number)
      .single()

    if (deviceError || !device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // 2. Upsert the medication slot (wheel + day slot)
    //    slot_number 1-7 = Mon-Sun, 0 = home (no dose)
    if (slot_number > 0) {
      const { error: slotError } = await supabaseAdmin
        .from('medication_slots')
        .upsert(
          { device_id: device.id, wheel, slot_number, is_dispensed: true, med_list: [] },
          { onConflict: 'device_id,wheel,slot_number' }
        )

      if (slotError) {
        // Non-fatal: log it but continue to write the dispense log
        console.error('[Dispense] Slot upsert failed:', slotError.message)
      }
    }

    // 3. Write dispense log
    const { error: logError } = await supabaseAdmin
      .from('dispense_logs')
      .insert({
        device_id:    device.id,
        slot_number:  slot_number,
        session_type: wheel,        // morning / midday / night
        status:       'dispensed',
        meds_dispensed: []
      })

    if (logError) {
      console.error('[Dispense] Log insert failed:', logError.message)
      return NextResponse.json({ error: 'Failed to log dispense event' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `${wheel} wheel slot ${slot_number} dispensed.` })

  } catch (err) {
    console.error('[Dispense] Error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
