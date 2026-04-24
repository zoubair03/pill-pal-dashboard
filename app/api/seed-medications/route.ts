import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Guard: only allow seeding once (check if table already has data)
export async function POST() {
  try {
    // Check if already seeded
    const { count } = await supabaseAdmin
      .from('medications')
      .select('*', { count: 'exact', head: true })

    if (count && count > 0) {
      return NextResponse.json({ 
        message: `Already seeded — ${count} medications in database.`, 
        seeded: false 
      })
    }

    // Read the local JSON file
    const filePath = path.join(process.cwd(), 'data', 'medications.json')
    const raw = fs.readFileSync(filePath, 'utf-8')
    const meds: any[] = JSON.parse(raw)

    // Insert in batches of 500 to avoid request size limits
    const BATCH = 500
    let inserted = 0

    for (let i = 0; i < meds.length; i += BATCH) {
      const chunk = meds.slice(i, i + BATCH).map(m => ({
        dci:          m.dci          || null,
        brand:        m.brand        || null,
        dose:         m.dose         || null,
        form:         m.form         || null,
        presentation: m.presentation || null,
        classe:       m.classe       || null,
        sousclasse:   m.sousclasse   || null,
        laboratoire:  m.laboratoire  || null,
        tableau:      m.tableau      || null,
        indication:   m.indication   || null,
        label:        m.label        || null,
        full_text:     m.full_text     || null,
      }))

      const { error } = await supabaseAdmin.from('medications').insert(chunk)
      if (error) {
        return NextResponse.json({ 
          error: `Batch ${i / BATCH} failed: ${error.message}` 
        }, { status: 500 })
      }
      inserted += chunk.length
    }

    return NextResponse.json({ 
      success: true, 
      message: `Seeded ${inserted} medications.` 
    })

  } catch (err) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Seed failed' 
    }, { status: 500 })
  }
}
