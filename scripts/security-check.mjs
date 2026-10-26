import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const protectedTables = [
  'orders',
  'order_items',
  'order_status_history',
  'stock_movements',
  'ledger_entries',
  'settlements',
  'settlement_orders',
  'store_private',
  'notifications',
  'webhook_events',
  'telegram_link_codes',
  'profiles',
]

const publicTables = [
  'categories',
  'platform_settings',
  'stores',
  'products',
  'product_variants',
  'product_images',
]

let failed = false

for (const table of protectedTables) {
  const { error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.log(`ok ${table}: blocked`)
  } else {
    console.error(`FAIL ${table}: readable by anon`)
    failed = true
  }
}

for (const table of publicTables) {
  const { error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error(`FAIL ${table}: public read failed`)
    failed = true
  } else {
    console.log(`ok ${table}: public read`)
  }
}

const { error: rpcError } = await supabase.rpc('get_settlement_summary')
if (rpcError) {
  console.log('ok get_settlement_summary: blocked for anon')
} else {
  console.error('FAIL get_settlement_summary: callable by anon')
  failed = true
}

process.exitCode = failed ? 1 : 0
