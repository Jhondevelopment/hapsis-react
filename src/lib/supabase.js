import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bskgqlhducfxfipflpqm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hPbZtYmMLtMn1yfRZa4O2w_nxf43EOa'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

export { SUPABASE_URL, SUPABASE_KEY }