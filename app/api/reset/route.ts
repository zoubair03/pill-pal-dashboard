import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import mqtt from 'mqtt'

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

    // Connect to HiveMQ Public Broker to broadcast reset instantly to the hardware
    const client = mqtt.connect('mqtt://broker.hivemq.com:1883')

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        client.end()
        // If MQTT fails, still return success because DB was reset successfully.
        resolve(NextResponse.json({ success: true, message: 'DB Reset, but MQTT timeout.' }))
      }, 3000)

      client.on('connect', () => {
        clearTimeout(timeout)
        const topic = `pillpal/cmd/${mac_address}`
        const payload = JSON.stringify({ action: "reset", slot: 0 })
        
        client.publish(topic, payload, { qos: 1 }, () => {
          client.end()
          resolve(NextResponse.json({ success: true, message: 'All slots reset to pending & Hardware triggered.' }))
        })
      })
      
      client.on('error', (err) => {
        clearTimeout(timeout)
        client.end()
        resolve(NextResponse.json({ success: true, message: 'DB Reset, but MQTT failed.' }))
      })
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
