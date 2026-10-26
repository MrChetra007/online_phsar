import type { Database } from '../lib/database.types'
import {
  imageExtensionForType,
  productImagePathFromUrl,
  productImageStoragePath,
} from '../lib/image'
import type { TranslationKey } from '../lib/i18n'
import { supabase } from './client'

export type Product = Database['public']['Tables']['products']['Row']
export type ProductStatus = Database['public']['Enums']['product_status']
export type ProductVariant =
  Database['public']['Tables']['product_variants']['Row']
export type ProductImage = Database['public']['Tables']['product_images']['Row']

type CategoryLabel = {
  name_km: string
  name_en: string
}

export type ProductWithDetails = Product & {
  variants: ProductVariant[]
  images: ProductImage[]
  category: CategoryLabel | null
}

type ProductRow = Product & {
  product_variants: ProductVariant[] | null
  product_images: ProductImage[] | null
  categories: CategoryLabel | null
}

export type ProductInput = {
  storeId: string
  categoryId: string | null
  name: string
  description: string
  status: ProductStatus
}

export type VariantInput = {
  label: string
  price: number
  stock: number
  sku: string
  isActive: boolean
}

const PRODUCT_SELECT =
  '*, product_variants(*), product_images(*), categories(name_km, name_en)'

function mapProduct(row: ProductRow): ProductWithDetails {
  return {
    id: row.id,
    store_id: row.store_id,
    category_id: row.category_id,
    name: row.name,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    variants: [...(row.product_variants ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    ),
    images: [...(row.product_images ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
    category: row.categories,
  }
}

export async function listMyProducts(
  storeId: string,
): Promise<ProductWithDetails[]> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('store_id', storeId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return ((data ?? []) as unknown as ProductRow[]).map(mapProduct)
}

export async function getMyProduct(
  productId: string,
): Promise<ProductWithDetails | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', productId)
    .maybeSingle()

  if (error) throw error
  return data ? mapProduct(data as unknown as ProductRow) : null
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      store_id: input.storeId,
      category_id: input.categoryId,
      name: input.name,
      description: input.description || null,
      status: input.status,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateProduct(
  productId: string,
  input: Omit<ProductInput, 'storeId'>,
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({
      category_id: input.categoryId,
      name: input.name,
      description: input.description || null,
      status: input.status,
    })
    .eq('id', productId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function createVariant(
  productId: string,
  input: VariantInput,
): Promise<ProductVariant> {
  const { data, error } = await supabase
    .from('product_variants')
    .insert({
      product_id: productId,
      label: input.label,
      price: input.price,
      stock: input.stock,
      sku: input.sku || null,
      is_active: input.isActive,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateVariant(
  variantId: string,
  input: VariantInput,
): Promise<ProductVariant> {
  const { data, error } = await supabase
    .from('product_variants')
    .update({
      label: input.label,
      price: input.price,
      stock: input.stock,
      sku: input.sku || null,
      is_active: input.isActive,
    })
    .eq('id', variantId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function addProductImage(
  storeId: string,
  productId: string,
  blob: Blob,
  sortOrder: number,
): Promise<ProductImage> {
  const extension = imageExtensionForType(blob.type)
  const path = productImageStoragePath(storeId, productId, extension)

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '31536000',
    })

  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = supabase.storage.from('product-images').getPublicUrl(path)

  const { data, error } = await supabase
    .from('product_images')
    .insert({
      product_id: productId,
      url: publicUrl,
      sort_order: sortOrder,
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from('product-images').remove([path])
    throw error
  }

  return data
}

export async function deleteProductImage(image: {
  id: string
  url: string
}): Promise<void> {
  const path = productImagePathFromUrl(image.url)

  if (path) {
    const { error: storageError } = await supabase.storage
      .from('product-images')
      .remove([path])
    if (storageError) throw storageError
  }

  const { error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', image.id)

  if (error) throw error
}

export async function getStoreCommissionPercent(): Promise<number> {
  const { data, error } = await supabase.rpc('get_store_commission_percent')
  if (error) throw error

  const percent = Number(data)
  if (!Number.isFinite(percent)) {
    throw new Error('INVALID_COMMISSION')
  }

  return percent
}

export function productErrorKey(error: unknown): TranslationKey {
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error ? (error as { code?: unknown }).code : null
    const message =
      'message' in error ? (error as { message?: unknown }).message : null

    if (code === '23505') return 'store.errorVariantDuplicate'
    if (code === '42501' || code === 'PGRST116' || message === 'FORBIDDEN') {
      return 'store.errorNotAllowed'
    }
  }

  return 'store.productError'
}
