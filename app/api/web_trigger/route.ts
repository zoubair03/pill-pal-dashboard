import { NextResponse } from 'next/server'
import * as fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const { slot_number } = await req.json()
    
    // We store the requested slot in a temporary JSON file 
    // so the ESP32 can pick it up via its next Ping request!
    const filePath = path.join(process.cwd(), 'data', 'pending_dispense.json')
    fs.writeFileSync(filePath, JSON.stringify({ 
      pendingSlot: slot_number, 
      timestamp: Date.now() 
    }))

    // Do NOT log to Supabase yet. The ESP32 will log it once it physically spins.
    return NextResponse.json({ success: true, pendingSlot: slot_number })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
