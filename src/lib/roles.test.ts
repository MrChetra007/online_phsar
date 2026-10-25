import { describe, expect, it } from 'vitest'
import { homeForRole } from './roles'

describe('homeForRole', () => {
  it('sends store owners to the store area', () => {
    expect(homeForRole('store_owner')).toBe('/store')
  })

  it('sends the super admin to the admin area', () => {
    expect(homeForRole('super_admin')).toBe('/admin')
  })
})
