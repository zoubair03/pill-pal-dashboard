import { NextResponse } from 'next/server'
import mqtt from 'mqtt'

export async function POST(req: Request) {
  try {
    // wheel: 'morning' | 'midday' | 'night'
    // slot:  1-7 (day of week: Mon=1 ... Sun=7)
    const { wheel, slot, serial_number } = await req.json()

    if (!serial_number || !wheel) {
      return NextResponse.json({ error: 'Missing serial_number or wheel' }, { status: 400 })
    }

    const client = mqtt.connect('mqtt://broker.hivemq.com:1883')

    return new Promise<Response>((resolve) => {
      const timeout = setTimeout(() => {
        client.end()
        resolve(NextResponse.json({ error: 'MQTT connection timeout' }, { status: 504 }))
      }, 5000)

      client.on('connect', () => {
        clearTimeout(timeout)
        const topic   = `pillpal/cmd/${serial_number}`
        // New payload includes wheel + day slot
        const payload = JSON.stringify({
          action: 'dispense',
          wheel,
          slot: slot ?? new Date().getDay() || 7   // fallback to today's day (1-7)
        })

        client.publish(topic, payload, { qos: 1 }, () => {
          client.end()
          resolve(NextResponse.json({ success: true, topic, payload }))
        })
      })

      client.on('error', () => {
        clearTimeout(timeout)
        client.end()
        resolve(NextResponse.json({ error: 'MQTT connection failed' }, { status: 500 }))
      })
    })

  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
