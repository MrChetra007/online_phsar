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
export type ProductOptionGroup =
  Database['public']['Tables']['product_option_groups']['Row']
export type ProductOption =
  Database['public']['Tables']['product_options']['Row']
export type ProductVariantOption =
  Database['public']['Tables']['product_variant_options']['Row']

export type ProductOptionGroupWithOptions =
  | (ProductOptionGroup & {
      options: ProductOption[]
    })
  | any

export type VariantOptionInput = {
  variantId: string
  optionId: string
}

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

export async function getProductLink(
  productId: string,
): Promise<string | null> {
  const { data, error } = await (supabase as any)
    .from('product_links')
    .select('product_link')
    .eq('product_id', productId)
    .maybeSingle()

  if (error) throw error
  return (data as { product_link: string } | null)?.product_link ?? null
}

export async function saveProductLink(
  productId: string,
  productLink: string,
): Promise<void> {
  const link = productLink.trim()

  if (link === '') {
    const { error } = await (supabase as any)
      .from('product_links')
      .delete()
      .eq('product_id', productId)

    if (error) throw error
    return
  }

  const { error } = await (supabase as any)
    .from('product_links')
    .upsert(
      { product_id: productId, product_link: link },
      { onConflict: 'product_id' },
    )

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

export async function listProductOptionGroups(
  productId: string,
): Promise<ProductOptionGroupWithOptions[]> {
  const { data, error } = await (supabase as any)
    .from('product_option_groups')
    .select('*, product_options(*)')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error

  const groups = (
    (data ?? []) as unknown as Array<
      ProductOptionGroup & { product_options: ProductOption[] | null }
    >
  ).map((group) => ({
    ...group,
    options: [...(group.product_options ?? [])].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return a.created_at.localeCompare(b.created_at)
    }),
  }))

  return groups.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.created_at.localeCompare(b.created_at)
  })
}

export async function createProductOptionGroup(
  productId: string,
  input: { nameEn: string; nameKm?: string; sortOrder?: number },
): Promise<ProductOptionGroup> {
  const { data, error } = await (supabase as any)
    .from('product_option_groups')
    .insert({
      product_id: productId,
      name_en: input.nameEn.trim(),
      name_km: input.nameKm?.trim() || null,
      sort_order: input.sortOrder ?? 0,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteProductOptionGroup(groupId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('product_option_groups')
    .delete()
    .eq('id', groupId)

  if (error) throw error
}

export async function createProductOption(
  groupId: string,
  input: { valueEn: string; valueKm?: string; sortOrder?: number },
): Promise<ProductOption> {
  const { data, error } = await (supabase as any)
    .from('product_options')
    .insert({
      group_id: groupId,
      value_en: input.valueEn.trim(),
      value_km: input.valueKm?.trim() || null,
      sort_order: input.sortOrder ?? 0,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function deleteProductOption(optionId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('product_options')
    .delete()
    .eq('id', optionId)

  if (error) throw error
}

export async function setVariantOptions(
  variantId: string,
  optionIds: string[],
): Promise<void> {
  const client = supabase as any

  const { error: deleteError } = await client
    .from('product_variant_options')
    .delete()
    .eq('variant_id', variantId)

  if (deleteError) throw deleteError

  if (optionIds.length === 0) return

  const rows = optionIds.map((optionId: string) => ({
    variant_id: variantId,
    option_id: optionId,
  }))

  const { error: insertError } = await client
    .from('product_variant_options')
    .insert(rows)

  if (insertError) throw insertError
}

export async function getVariantOptionIds(
  variantId: string,
): Promise<string[]> {
  const { data, error } = await (supabase as any)
    .from('product_variant_options')
    .select('option_id')
    .eq('variant_id', variantId)

  if (error) throw error
  return ((data ?? []) as Array<{ option_id: string }>).map(
    (row) => row.option_id,
  )
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
