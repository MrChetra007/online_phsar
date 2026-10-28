export const GUEST_FAVORITES_KEY = 'khmeronlineshop.guest-favorites.v1'

export function parseGuestFavorites(raw: string | null): string[] {
  if (!raw) return []

  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []

    return [
      ...new Set(
        value.filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        ),
      ),
    ]
  } catch {
    return []
  }
}

export function readGuestFavorites(): string[] {
  try {
    return parseGuestFavorites(window.localStorage.getItem(GUEST_FAVORITES_KEY))
  } catch {
    return []
  }
}

export function writeGuestFavorites(ids: string[]): void {
  try {
    if (ids.length === 0) {
      window.localStorage.removeItem(GUEST_FAVORITES_KEY)
      return
    }
    window.localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(ids))
  } catch {
    // Storage can be unavailable (private mode, quota); favorites still work
    // for the current session.
  }
}
