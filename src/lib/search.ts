const MAX_QUERY_LENGTH = 100

export function normalizeSearchQuery(value: string): string {
  return (value ?? '').trim().slice(0, MAX_QUERY_LENGTH)
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}
