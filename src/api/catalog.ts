import type { Database } from '../lib/database.types'
import { escapeLikePattern, normalizeSearchQuery } from '../lib/search'
import { supabase } from './client'

type Product = Database['public']['Tables']['products']['Row']
type ProductVariant = Database['public']['Tables']['product_variants']['Row']
type ProductImage = Database['public']['Tables']['product_images']['Row']
type ProductOptionGroup =
  Database['public']['Tables']['product_option_groups']['Row']
type ProductOption = Database['public']['Tables']['product_options']['Row']

export type PublicCategory = {
  name_km: string
  name_en: string
  slug: string
}

export type PublicOptionGroup = Pick<
  ProductOptionGroup,
  'id' | 'name_en' | 'name_km' | 'sort_order'
> & {
  options: Pick<ProductOption, 'id' | 'value_en' | 'value_km' | 'sort_order'>[]
}

export type PublicProduct = Pick<
  Product,
  'id' | 'store_id' | 'name' | 'description' | 'category_id' | 'created_at'
> & {
  variants: Pick<
    ProductVariant,
    'id' | 'label' | 'price' | 'stock' | 'is_active' | 'created_at'
  >[]
  images: Pick<ProductImage, 'id' | 'url' | 'sort_order'>[]
  category: PublicCategory | null
  store: { name: string; slug: string } | null
  optionGroups: PublicOptionGroup[]
}

type PublicProductRow = PublicProduct & {
  product_variants: PublicProduct['variants'] | null
  product_images: PublicProduct['images'] | null
  categories: PublicCategory | null
  stores: PublicProduct['store']
  product_option_groups?:
    | (PublicOptionGroup & {
        product_options: PublicOptionGroup['options'] | null
      })[]
    | null
} | any

type ListPublicProductsOptions = {
  storeId?: string
  categoryIds?: string[]
  query?: string
  limit?: number
}

export type ProductSuggestion = {
  id: string
  name: string
  imageUrl: string | null
  price: number
  storeName: string | null
}

type ProductSuggestionRow = {
  id: string
  name: string
  stores: { name: string } | null
  product_variants:
    | {
        price: number
        is_active: boolean
      }[]
    | null
  product_images: { url: string; sort_order: number }[] | null
}

const PUBLIC_PRODUCT_SELECT =
  'id, store_id, name, description, category_id, created_at, categories(name_km, name_en, slug), stores(name, slug), product_variants(id, label, price, stock, is_active, created_at), product_images(id, url, sort_order), product_option_groups(id, name_en, name_km, sort_order, product_options(id, value_en, value_km, sort_order))'

function mapPublicProduct(row: PublicProductRow): PublicProduct {
  const rawGroups = ((row as any).product_option_groups ?? []) as any[]
  const optionGroups = [...rawGroups]
    .map((group: any) => ({
      id: group.id,
      name_en: group.name_en,
      name_km: group.name_km,
      sort_order: group.sort_order,
      options: [...(group.product_options ?? [])].sort((a: any, b: any) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
        return String(a.id).localeCompare(String(b.id))
      }),
    }))
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return a.id.localeCompare(b.id)
    })

  return {
    id: row.id,
    store_id: row.store_id,
    name: row.name,
    description: row.description,
    category_id: row.category_id,
    created_at: row.created_at,
    variants: [...(row.product_variants ?? [])]
      .filter((variant) => variant.is_active)
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    images: [...(row.product_images ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
    category: row.categories,
    store: row.stores,
    optionGroups,
  }
}

export async function listPublicProducts({
  storeId,
  categoryIds,
  query,
  limit = 60,
}: ListPublicProductsOptions = {}): Promise<PublicProduct[]> {
  if (categoryIds && categoryIds.length === 0) return []

  let request = supabase
    .from('products')
    .select(PUBLIC_PRODUCT_SELECT)
    .eq('status', 'active')

  if (storeId) request = request.eq('store_id', storeId)
  if (categoryIds) request = request.in('category_id', categoryIds)

  const term = normalizeSearchQuery(query ?? '')
  if (term) {
    request = request.ilike('name', `%${escapeLikePattern(term)}%`)
  }

  const { data, error } = await request
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return ((data ?? []) as unknown as PublicProductRow[])
    .map(mapPublicProduct)
    .filter((product) => product.variants.length > 0)
}

export async function listProductSuggestions(
  query: string,
  limit = 6,
): Promise<ProductSuggestion[]> {
  const term = normalizeSearchQuery(query)
  if (!term) return []

  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, created_at, stores(name), product_variants(price, is_active), product_images(url, sort_order)',
    )
    .eq('status', 'active')
    .ilike('name', `%${escapeLikePattern(term)}%`)
    .order('created_at', { ascending: false })
    .limit(limit * 2)

  if (error) throw error

  return ((data ?? []) as unknown as ProductSuggestionRow[])
    .map((row): ProductSuggestion | null => {
      const variants = (row.product_variants ?? []).filter(
        (variant) => variant.is_active,
      )
      if (variants.length === 0) return null

      const image = [...(row.product_images ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      )[0]

      return {
        id: row.id,
        name: row.name,
        imageUrl: image?.url ?? null,
        price: Math.min(...variants.map((variant) => variant.price)),
        storeName: row.stores?.name ?? null,
      }
    })
    .filter(
      (suggestion): suggestion is ProductSuggestion => suggestion !== null,
    )
    .slice(0, limit)
}

export async function listFeaturedProducts(
  limit = 8,
): Promise<PublicProduct[]> {
  return listPublicProducts({ limit })
}

export async function getPublicProduct(
  productId: string,
): Promise<PublicProduct | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PUBLIC_PRODUCT_SELECT)
    .eq('id', productId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const product = mapPublicProduct(data as unknown as PublicProductRow)
  return product.variants.length > 0 ? product : null
}
