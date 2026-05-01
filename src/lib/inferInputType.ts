/** Infer the appropriate HTML input type from a field value */
export function inferInputType(value: unknown): 'number' | 'text' | 'datetime-local' {
  if (value instanceof Date) return 'datetime-local'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') {
    // ISO date strings
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'datetime-local'
  }
  return 'text'
}

export function parseInputValue(raw: string, originalValue: unknown): unknown {
  if (typeof originalValue === 'number') {
    const n = Number(raw)
    return Number.isNaN(n) ? raw : n
  }
  return raw
}
