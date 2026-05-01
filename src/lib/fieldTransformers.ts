/**
 * Context-aware field transformers for workout_step and other message types.
 * Converts between raw FIT-stored values and human-friendly display/input.
 */

export type InputKind = 'text' | 'number' | 'duration' | 'watts' | 'select'

export interface SelectOption {
  label: string
  value: unknown // the stored value (string after enum decode, or number)
}

export interface FieldTransformer {
  toDisplay(raw: unknown, row: Record<string, unknown>): string
  toStored(display: string, raw: unknown, row: Record<string, unknown>): unknown
  inputKind: InputKind
  unit?: string
  placeholder?: string
  options?: SelectOption[] // only for inputKind === 'select'
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


// ── Enum select transformers ──────────────────────────────────────────────────

function makeSelect(options: SelectOption[]): FieldTransformer {
  return {
    toDisplay: (raw) => String(raw ?? ''),
    toStored: (display) => display,
    inputKind: 'select',
    options,
  }
}

const TARGET_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Open (no target)', value: 'open' },
  { label: 'Power (W)', value: 'power' },
  { label: 'Power % FTP', value: 'power_percent_ftp' },
  { label: 'Heart Rate (BPM)', value: 'heart_rate' },
  { label: 'Cadence (RPM)', value: 'cadence' },
  { label: 'Speed', value: 'speed' },
  { label: 'Grade (%)', value: 'grade' },
  { label: 'Resistance', value: 'resistance' },
  { label: 'Reps', value: 'reps' },
  { label: 'Power 3s Avg', value: 'power_3s_avg' },
  { label: 'Power 10s Avg', value: 'power_10s_avg' },
  { label: 'Power 30s Avg', value: 'power_30s_avg' },
  { label: 'Power Lap Avg', value: 'power_lap_avg' },
]

const DURATION_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Time', value: 'time' },
  { label: 'Distance', value: 'distance' },
  { label: 'Calories', value: 'calories' },
  { label: 'Open (lap button)', value: 'open' },
  { label: 'HR < threshold', value: 'hr_less_than' },
  { label: 'HR > threshold', value: 'hr_greater_than' },
  { label: 'Power < threshold', value: 'power_less_than' },
  { label: 'Power > threshold', value: 'power_greater_than' },
  { label: 'Reps', value: 'reps' },
  { label: 'Repeat until steps complete', value: 'repeat_until_steps_cmplt' },
  { label: 'Repeat until time', value: 'repeat_until_time' },
  { label: 'Repeat until distance', value: 'repeat_until_distance' },
  { label: 'Repeat until calories', value: 'repeat_until_calories' },
]

const INTENSITY_OPTIONS: SelectOption[] = [
  { label: 'Active', value: 'active' },
  { label: 'Rest', value: 'rest' },
  { label: 'Warm Up', value: 'warmup' },
  { label: 'Cool Down', value: 'cooldown' },
]

// ── Units for target value fields by target type ──────────────────────────────

const TARGET_VALUE_UNIT: Record<string, string | undefined> = {
  heart_rate: 'BPM',
  cadence: 'RPM',
  grade: '%',
  power_percent_ftp: '% FTP',
}

function targetValueTransformer(_field: 'low' | 'high'): FieldTransformer {
  return {
    toDisplay(raw, row) {
      const targetType = String(row['target_type'] ?? '')
      if (targetType === 'power') {
        const v = typeof raw === 'number' ? raw : Number(raw)
        return isNaN(v) ? String(raw ?? '') : String(v - 1000)
      }
      return String(raw ?? '')
    },
    toStored(display, raw, row) {
      const targetType = String(row['target_type'] ?? '')
      const n = Number(display)
      if (isNaN(n)) return raw
      if (targetType === 'power') return n + 1000
      return n
    },
    get unit() {
      // Dynamic — can't be a real getter in this context; handled in rendering
      return undefined
    },
    inputKind: 'watts', // reused for number input; unit rendered separately
    placeholder: '0',
  }
}

export function getTargetValueUnit(targetType: string): string {
  if (targetType === 'power') return 'W'
  return TARGET_VALUE_UNIT[targetType] ?? ''
}

// ── Registry ─────────────────────────────────────────────────────────────────

/**
 * Returns a transformer for the given field.
 * `row` should be the EFFECTIVE row (original merged with edits) so that
 * changing target_type immediately affects how custom_target_value_* renders.
 */
export function getTransformer(
  msgType: string,
  field: string,
  row: Record<string, unknown>,
): FieldTransformer | null {
  if (msgType === 'workout_step') {
    const durationType = String(row['duration_type'] ?? '')
    const targetType = String(row['target_type'] ?? '')

    switch (field) {
      case 'duration_type':
        return makeSelect(DURATION_TYPE_OPTIONS)
      case 'target_type':
        return makeSelect(TARGET_TYPE_OPTIONS)
      case 'intensity':
        return makeSelect(INTENSITY_OPTIONS)
      case 'duration_value':
        if (durationType === 'time') return durationTransformer
        break
      case 'custom_target_value_low':
        if (targetType === 'power') return targetValueTransformer('low')
        break
      case 'custom_target_value_high':
        if (targetType === 'power') return targetValueTransformer('high')
        break
    }
  }

  return null
}
