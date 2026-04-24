import { NextResponse } from 'next/server'
import mqtt from 'mqtt'

// Today's day slot: Mon=1 ... Sun=7
function todaySlot(): number {
  const dow = new Date().getDay() // 0=Sun
  return dow === 0 ? 7 : dow
}

export async function POST(req: Request) {
  try {
    // wheel: 'morning' | 'midday' | 'night'
    // slot:  1-7 (Mon-Sun), optional — defaults to today
    const { wheel, slot, serial_number } = await req.json()

    if (!serial_number || !wheel) {
      return NextResponse.json({ error: 'Missing serial_number or wheel' }, { status: 400 })
    }

    const topic   = `pillpal/cmd/${serial_number}`
    const payload = JSON.stringify({
      action: 'dispense',
      wheel,
      slot: slot ?? todaySlot()
    })

    // Use WebSocket so it works in Vercel serverless (TCP mqtt:// doesn't work)
    const result = await new Promise<{ ok: boolean; reason?: string }>((resolve) => {
      const client = mqtt.connect('wss://broker.hivemq.com:8884/mqtt')

      const timeout = setTimeout(() => {
        client.end(true)
        resolve({ ok: false, reason: 'MQTT connection timeout' })
      }, 6000)

      client.on('connect', () => {
        clearTimeout(timeout)
        client.publish(topic, payload, { qos: 1 }, (err) => {
          client.end()
          if (err) resolve({ ok: false, reason: err.message })
          else     resolve({ ok: true })
        })
      })

      client.on('error', (err) => {
        clearTimeout(timeout)
        client.end(true)
        resolve({ ok: false, reason: err.message })
      })
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.reason ?? 'MQTT failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, topic, payload })

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
