import { NextResponse } from 'next/server'
import mqtt from 'mqtt'

export async function POST(req: Request) {
  try {
    const { slot_number, mac_address } = await req.json()
    
    if (!mac_address) {
      return NextResponse.json({ error: 'Missing mac_address' }, { status: 400 })
    }

    // Connect to HiveMQ Public Broker
    const client = mqtt.connect('mqtt://broker.hivemq.com:1883')

    return new Promise((resolve) => {
      // Setup timeout to prevent hanging API
      const timeout = setTimeout(() => {
        client.end()
        resolve(NextResponse.json({ error: 'MQTT connection timeout' }, { status: 504 }))
      }, 5000)

      client.on('connect', () => {
        clearTimeout(timeout)
        const topic = `pillpal/cmd/${mac_address}`
        const payload = JSON.stringify({ action: "dispense", slot: slot_number })
        
        // Publish and close immediately
        client.publish(topic, payload, { qos: 1 }, () => {
          client.end()
          resolve(NextResponse.json({ success: true, published: true, topic, payload }))
        })
      })

      client.on('error', (err) => {
        clearTimeout(timeout)
        client.end()
        resolve(NextResponse.json({ error: 'MQTT connection failed' }, { status: 500 }))
      })
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
