import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import mqtt from 'mqtt'

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

    // 1. Look up device
    const { data: device, error: devErr } = await supabaseAdmin
      .from('devices')
      .select('id')
      .eq('serial_number', serial_number)
      .single()

    if (devErr || !device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // 2. Mark all medication_slots as NOT dispensed for this device
    const { error: resetErr } = await supabaseAdmin
      .from('medication_slots')
      .update({ is_dispensed: false })
      .eq('device_id', device.id)

    if (resetErr) {
      console.error('[Reset] Slot reset failed:', resetErr.message)
      return NextResponse.json({ error: 'Failed to reset slots' }, { status: 500 })
    }

    // 3. Reset current_slot on device record
    await supabaseAdmin
      .from('devices')
      .update({ current_slot: 0 })
      .eq('id', device.id)

    // 4. Tell ESP32 to home all wheels via MQTT (WSS — required on Vercel)
    const mqttResult = await new Promise<{ ok: boolean }>((resolve) => {
      const client  = mqtt.connect('wss://broker.hivemq.com:8884/mqtt')
      const timer   = setTimeout(() => {
        client.end(true)
        resolve({ ok: false })
      }, 6000)

      client.on('connect', () => {
        clearTimeout(timer)
        const topic   = `pillpal/cmd/${serial_number}`
        // action 'reset_all' → ESP32 homes all 3 wheels and clears lastDispensedDay
        const payload = JSON.stringify({ action: 'reset_all' })
        client.publish(topic, payload, { qos: 1 }, (err) => {
          client.end()
          resolve({ ok: !err })
        })
      })

      client.on('error', () => {
        clearTimeout(timer)
        client.end(true)
        resolve({ ok: false })
      })
    })

    return NextResponse.json({
      success:  true,
      mqtt:     mqttResult.ok,
      message:  mqttResult.ok
        ? 'All slots reset & all wheels homed.'
        : 'DB reset OK — MQTT timed out (wheels will home on next restart).'
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
