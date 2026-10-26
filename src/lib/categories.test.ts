import { describe, expect, it } from 'vitest'
import {
  buildCategoryTree,
  descendantCategoryIds,
  flattenCategoryTree,
} from './categories'

const category = (
  id: string,
  parentId: string | null,
  sortOrder: number,
  nameEn = id,
) => ({
  id,
  parent_id: parentId,
  name_en: nameEn,
  name_km: nameEn,
  sort_order: sortOrder,
})

describe('buildCategoryTree', () => {
  it('nests children and sorts siblings', () => {
    const tree = buildCategoryTree([
      category('child-b', 'root', 2),
      category('root', null, 1),
      category('child-a', 'root', 1),
      category('other', null, 0),
    ])

    expect(tree.map((node) => node.id)).toEqual(['other', 'root'])
    expect(tree[1].children.map((node) => node.id)).toEqual([
      'child-a',
      'child-b',
    ])
  })

  it('treats missing parents as roots', () => {
    const tree = buildCategoryTree([category('child', 'missing', 1)])
    expect(tree[0].id).toBe('child')
  })
})

describe('flattenCategoryTree', () => {
  it('returns depth-first order with depth', () => {
    const tree = buildCategoryTree([
      category('root', null, 1),
      category('child', 'root', 1),
    ])
    const flat = flattenCategoryTree(tree)

    expect(flat.map((entry) => [entry.category.id, entry.depth])).toEqual([
      ['root', 0],
      ['child', 1],
    ])
  })
})

describe('descendantCategoryIds', () => {
  it('collects all descendants without the category itself', () => {
    const categories = [
      category('root', null, 1),
      category('child', 'root', 1),
      category('grandchild', 'child', 1),
      category('other', null, 2),
    ]
    expect([...descendantCategoryIds(categories, 'root')]).toEqual([
      'child',
      'grandchild',
    ])
    expect([...descendantCategoryIds(categories, 'missing')]).toEqual([])
  })
})
