export type OrderSource = 'platform' | 'store_link'

const STORAGE_KEY = 'kos.order_source'

export function rememberStoreLinkSource(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, 'store_link')
  } catch {
    return
  }
}

export function getOrderSource(): OrderSource {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'store_link'
      ? 'store_link'
      : 'platform'
  } catch {
    return 'platform'
  }
}

export function clearOrderSource(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    return
  }
}
