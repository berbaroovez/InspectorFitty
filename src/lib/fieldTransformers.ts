/**
 * Context-aware field transformers for workout_step and other message types.
 *
 * Each transformer converts between the raw FIT-stored value and a human-friendly
 * display string, and defines what input component to render.
 */

export type InputKind = 'text' | 'number' | 'duration' | 'watts' | 'percent'

export interface FieldTransformer {
  /** Convert raw stored value → human string for display/input */
  toDisplay(raw: unknown, row: Record<string, unknown>): string
  /** Convert human input string → raw stored value */
  toStored(display: string, raw: unknown, row: Record<string, unknown>): unknown
  inputKind: InputKind
  unit?: string
  placeholder?: string
}

// ── Duration (milliseconds ↔ MM:SS or HH:MM:SS) ──────────────────────────────

function msToTime(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function timeToMs(input: string): number | null {
  // Accept: M:SS, MM:SS, H:MM:SS, HH:MM:SS, or plain seconds
  const parts = input.trim().split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 1) return parts[0]! * 1000
  if (parts.length === 2) return (parts[0]! * 60 + parts[1]!) * 1000
  if (parts.length === 3) return (parts[0]! * 3600 + parts[1]! * 60 + parts[2]!) * 1000
  return null
}

const durationTransformer: FieldTransformer = {
  toDisplay: (raw) => {
    const ms = typeof raw === 'number' ? raw : Number(raw)
    return isNaN(ms) ? String(raw ?? '') : msToTime(ms)
  },
  toStored: (display, raw) => {
    const ms = timeToMs(display)
    return ms !== null ? ms : (typeof raw === 'number' ? raw : display)
  },
  inputKind: 'duration',
  unit: 'MM:SS',
  placeholder: '0:00',
}

// ── Power watts (stored as watts + 1000 offset) ───────────────────────────────

const powerTransformer: FieldTransformer = {
  toDisplay: (raw) => {
    const v = typeof raw === 'number' ? raw : Number(raw)
    return isNaN(v) ? String(raw ?? '') : String(v - 1000)
  },
  toStored: (display, raw) => {
    const watts = Number(display)
    if (isNaN(watts)) return raw
    return watts + 1000
  },
  inputKind: 'watts',
  unit: 'W',
  placeholder: '0',
}

// ── Registry ─────────────────────────────────────────────────────────────────

/** Look up a transformer for a given message type, field name, and sibling row values */
export function getTransformer(
  msgType: string,
  field: string,
  row: Record<string, unknown>,
): FieldTransformer | null {
  if (msgType === 'workout_step') {
    const durationType = row['duration_type']
    const targetType = row['target_type']

    if (field === 'duration_value') {
      // Apply time transform only for time-based durations
      if (durationType === 'time') return durationTransformer
    }

    if (field === 'custom_target_value_low' || field === 'custom_target_value_high') {
      if (targetType === 'power') return powerTransformer
    }
  }

  return null
}
