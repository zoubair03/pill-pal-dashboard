import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Auth Token' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    const { serial_number } = await req.json()
    if (!serial_number) {
      return NextResponse.json({ error: 'Missing serial_number' }, { status: 400 })
    }

    // Use Service Role admin client to actually manipulate DB, but verify Token first!
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    // Verify token to get the user ID safely
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized User Token' }, { status: 401 })
    }

    // 1. Find the device by SN
    const { data: device, error: devErr } = await supabaseAdmin
      .from('devices')
      .select('id, owner_id')
      .eq('serial_number', serial_number)
      .single()

    if (devErr || !device) {
      return NextResponse.json({ error: 'Invalid Serial Number. Device not found.' }, { status: 404 })
    }

    // 2. Check if already claimed
    if (device.owner_id && device.owner_id !== user.id) {
      return NextResponse.json({ error: 'Device is already linked to another account!' }, { status: 403 })
    }

    // 3. Ensure Profile exists BEFORE claiming (to satisfy foreign key constraints)
    const { data: existingProfile } = await supabaseAdmin.from('profiles').select('id').eq('id', user.id).single()
    if (!existingProfile) {
       const { error: profErr } = await supabaseAdmin.from('profiles').insert({
          id: user.id
       })
       if (profErr) {
          return NextResponse.json({ error: 'Failed to initialize user profile: ' + profErr.message }, { status: 500 })
       }
    }

    // 4. Claim device!
    const { error: updateErr } = await supabaseAdmin
      .from('devices')
      .update({ owner_id: user.id })
      .eq('serial_number', serial_number)

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to bind device: ' + updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Device successfully claimed.' })

  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
