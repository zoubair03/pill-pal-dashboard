import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_KEY'
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { mac_address, slot_number } = body

    if (!mac_address || slot_number === undefined) {
      return NextResponse.json({ error: 'Missing mac_address or slot_number' }, { status: 400 })
    }

    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('id, owner_id')
      .eq('mac_address', mac_address)
      .single()

    if (deviceError || !device) {
      return NextResponse.json({ error: 'Device not authorized or not found' }, { status: 404 })
    }

    const { data: slot, error: slotError } = await supabaseAdmin
      .from('medication_slots')
      .select('id, med_list')
      .eq('device_id', device.id)
      .eq('slot_number', slot_number)
      .single()

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot configuration not found' }, { status: 404 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('medication_slots')
      .update({ is_dispensed: true })
      .eq('id', slot.id)

    // Only update the device's physical motor pointer — NOT last_sync!
    // last_sync should only be touched by the real hardware heartbeat (/api/ping)
    await supabaseAdmin
      .from('devices')
      .update({ current_slot: slot_number })
      .eq('id', device.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update slot status' }, { status: 500 })
    }

    const { error: logError } = await supabaseAdmin
      .from('dispense_logs')
      .insert({
        device_id: device.id,
        slot_number: slot_number,
        session_type: 'automated',
        status: 'dispensed',
        meds_dispensed: slot.med_list
      })

    if (logError) {
      return NextResponse.json({ error: 'Failed to document dispense event' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Slot ${slot_number} dispensed successfully.` })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
