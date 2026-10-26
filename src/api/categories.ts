import type { Database } from '../lib/database.types'
import type { TranslationKey } from '../lib/i18n'
import { slugify } from '../lib/store'
import { supabase } from './client'

export type Category = Database['public']['Tables']['categories']['Row']

export type CategoryInput = {
  nameKm: string
  nameEn: string
  parentId: string | null
  sortOrder: number
  requiresSize: boolean
  isActive: boolean
}

function categorySlug(nameEn: string): string {
  return slugify(nameEn) || `category-${Date.now().toString(36)}`
}

export async function listActiveCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name_en', { ascending: true })

  if (error) throw error
  return data
}

export async function getActiveCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function listAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name_en', { ascending: true })

  if (error) throw error
  return data
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name_km: input.nameKm,
      name_en: input.nameEn,
      slug: categorySlug(input.nameEn),
      parent_id: input.parentId,
      sort_order: input.sortOrder,
      requires_size: input.requiresSize,
      is_active: input.isActive,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateCategory(
  categoryId: string,
  input: Partial<CategoryInput>,
): Promise<Category> {
  const patch: Database['public']['Tables']['categories']['Update'] = {}

  if (input.nameKm !== undefined) patch.name_km = input.nameKm
  if (input.nameEn !== undefined) patch.name_en = input.nameEn
  if (input.parentId !== undefined) patch.parent_id = input.parentId
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder
  if (input.requiresSize !== undefined) {
    patch.requires_size = input.requiresSize
  }
  if (input.isActive !== undefined) patch.is_active = input.isActive

  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', categoryId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export function categoryErrorKey(error: unknown): TranslationKey {
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error ? (error as { code?: unknown }).code : null
    if (code === '23505') return 'admin.categorySlugTaken'
  }

  return 'admin.categoryError'
}
