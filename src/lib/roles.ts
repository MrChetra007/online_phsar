import type { Database } from './database.types'

export type UserRole = Database['public']['Enums']['user_role']

export function homeForRole(role: UserRole): '/store' | '/admin' {
  return role === 'super_admin' ? '/admin' : '/store'
}
