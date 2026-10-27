import type { Database } from '../lib/database.types'
import { supabase } from './client'

export type Store = Database['public']['Tables']['stores']['Row']
export type StorePrivate = Database['public']['Tables']['store_private']['Row']
export type StoreStatus = Database['public']['Enums']['store_status']

export type PublicStore = Pick<
  Store,
  | 'id'
  | 'name'
  | 'slug'
  | 'description'
  | 'logo_url'
  | 'province'
  | 'delivery_fee_local'
  | 'delivery_fee_other'
  | 'facebook_url'
  | 'telegram_username'
>

export type StoreWithPrivate = {
  store: Store
  privateInfo: StorePrivate | null
}

export type StoreDetailsInput = {
  name: string
  description: string
  province: string
  deliveryFeeLocal: number
  deliveryFeeOther: number
  facebookUrl: string
  telegramUsername: string
}

export type StoreCreateInput = StoreDetailsInput & {
  slug: string
}

export type StorePrivateInput = {
  contactPhone: string
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
}

export async function getMyStore(
  userId: string,
): Promise<StoreWithPrivate | null> {
  const { data: store, error } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!store) return null

  const { data: privateInfo, error: privateError } = await supabase
    .from('store_private')
    .select('*')
    .eq('store_id', store.id)
    .maybeSingle()

  if (privateError) throw privateError

  return { store, privateInfo }
}

export async function createStore(
  ownerId: string,
  input: StoreCreateInput,
): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .insert({
      owner_id: ownerId,
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      province: input.province || null,
      delivery_fee_local: input.deliveryFeeLocal,
      delivery_fee_other: input.deliveryFeeOther,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateStore(
  storeId: string,
  input: StoreDetailsInput,
): Promise<Store> {
  const { data, error } = await supabase
    .from('stores')
    .update({
      name: input.name,
      description: input.description || null,
      province: input.province || null,
      delivery_fee_local: input.deliveryFeeLocal,
      delivery_fee_other: input.deliveryFeeOther,
      facebook_url: input.facebookUrl || null,
      telegram_username: input.telegramUsername || null,
    })
    .eq('id', storeId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateStorePrivate(
  storeId: string,
  input: StorePrivateInput,
): Promise<StorePrivate> {
  const { data, error } = await supabase
    .from('store_private')
    .update({
      contact_phone: input.contactPhone || null,
      bank_name: input.bankName || null,
      bank_account_name: input.bankAccountName || null,
      bank_account_number: input.bankAccountNumber || null,
    })
    .eq('store_id', storeId)
    .select('*')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('STORE_PRIVATE_MISSING')
  return data
}

export async function getActiveStoreBySlug(
  slug: string,
): Promise<PublicStore | null> {
  const { data, error } = await supabase
    .from('stores')
    .select(
      'id, name, slug, description, logo_url, province, delivery_fee_local, delivery_fee_other, facebook_url, telegram_username',
    )
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function listStoresForAdmin(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function setStoreStatus(
  storeId: string,
  status: StoreStatus,
): Promise<void> {
  const { error } = await supabase.rpc('set_store_status', {
    p_store_id: storeId,
    p_status: status,
    p_note: `Status changed to ${status} from the admin panel`,
  })

  if (error) throw error
}

export async function createTelegramLinkCode(storeId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_telegram_link_code', {
    p_store_id: storeId,
  })

  if (error) throw error
  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('INVALID_TELEGRAM_LINK_CODE')
  }

  return data
}
