import type { Language } from './i18n'

type CategoryLike = {
  id: string
  parent_id: string | null
  name_en: string
  name_km: string
  sort_order: number
}

export type CategoryNode<T extends CategoryLike> = T & {
  children: CategoryNode<T>[]
}

export type FlatCategory<T extends CategoryLike> = {
  category: T
  depth: number
}

function compareCategories(a: CategoryLike, b: CategoryLike): number {
  return a.sort_order - b.sort_order || a.name_en.localeCompare(b.name_en)
}

export function buildCategoryTree<T extends CategoryLike>(
  categories: T[],
): CategoryNode<T>[] {
  const nodes = new Map<string, CategoryNode<T>>()
  const roots: CategoryNode<T>[] = []

  for (const category of categories) {
    nodes.set(category.id, { ...category, children: [] })
  }

  for (const category of categories) {
    const node = nodes.get(category.id)
    if (!node) continue

    const parent = category.parent_id
      ? nodes.get(category.parent_id)
      : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const sortTree = (items: CategoryNode<T>[]) => {
    items.sort(compareCategories)
    for (const item of items) sortTree(item.children)
  }
  sortTree(roots)

  return roots
}

export function flattenCategoryTree<T extends CategoryLike>(
  nodes: CategoryNode<T>[],
  depth = 0,
): FlatCategory<T>[] {
  return nodes.flatMap((node) => [
    { category: node, depth },
    ...flattenCategoryTree(node.children, depth + 1),
  ])
}

export function descendantCategoryIds<T extends CategoryLike>(
  categories: T[],
  categoryId: string,
): Set<string> {
  const tree = buildCategoryTree(categories)
  const result = new Set<string>()

  const find = (
    nodes: CategoryNode<T>[],
    id: string,
  ): CategoryNode<T> | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node
      const child = find(node.children, id)
      if (child) return child
    }
    return undefined
  }

  const collect = (node: CategoryNode<T>) => {
    for (const child of node.children) {
      result.add(child.id)
      collect(child)
    }
  }

  const target = find(tree, categoryId)
  if (target) collect(target)

  return result
}

export function categoryName(
  category: Pick<CategoryLike, 'name_en' | 'name_km'>,
  language: Language,
): string {
  return language === 'km' ? category.name_km : category.name_en
}
