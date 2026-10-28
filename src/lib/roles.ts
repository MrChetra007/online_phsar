import type { Database } from './database.types'

export type UserRole = Database['public']['Enums']['user_role']

export type SignupRole = Extract<UserRole, 'customer' | 'store_owner'>

export function homeForRole(role: UserRole): '/store' | '/admin' | '/account' {
  if (role === 'super_admin') return '/admin'
  if (role === 'customer') return '/account'
  return '/store'
}
