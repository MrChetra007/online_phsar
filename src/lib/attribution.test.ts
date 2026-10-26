import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearOrderSource,
  getOrderSource,
  rememberStoreLinkSource,
} from './attribution'

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

beforeEach(() => {
  vi.stubGlobal('sessionStorage', new MemoryStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('order source attribution', () => {
  it('defaults to the platform', () => {
    expect(getOrderSource()).toBe('platform')
  })

  it('remembers store link entries for the session', () => {
    rememberStoreLinkSource()
    expect(getOrderSource()).toBe('store_link')
  })

  it('clears the stored source', () => {
    rememberStoreLinkSource()
    clearOrderSource()
    expect(getOrderSource()).toBe('platform')
  })
})
