import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_KEY'
)

export async function POST(req: Request) {
  try {
    const { mac_address, battery_level } = await req.json()

    if (!mac_address) {
      return NextResponse.json({ error: 'Missing mac_address' }, { status: 400 })
    }

    const payload: any = { last_sync: new Date().toISOString() }
    if (battery_level !== undefined) {
      payload.battery_level = battery_level
    }

    const { data: dev } = await supabaseAdmin
      .from('devices')
      .update(payload)
      .eq('mac_address', mac_address)
      .select('current_slot, schedule')
      .single()

    if (!dev) {
      return NextResponse.json({ error: 'Failed to update device heartbeat' }, { status: 500 })
    }

    const responseObj: any = { 
      success: true, 
      current_slot: dev.current_slot, 
      schedule: dev.schedule 
    }

    // Check if there's a manual Web Trigger pending
    const fs = require('fs')
    const path = require('path')
    const filePath = path.join(process.cwd(), 'data', 'pending_dispense.json')
    
    if (fs.existsSync(filePath)) {
       try {
         const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
         if (Date.now() - fileData.timestamp < 30000) {
            // Valid within the last 30 seconds
            responseObj.force_dispense = fileData.pendingSlot
            fs.unlinkSync(filePath) // Delete so it doesn't run twice
         }
       } catch (e) {
         // ignore
       }
    }

    return NextResponse.json(responseObj)

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
