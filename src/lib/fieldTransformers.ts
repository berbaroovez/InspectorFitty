/**
 * Context-aware field transformers for workout_step and other message types.
 * Converts between raw FIT-stored values and human-friendly display/input.
 *
 * Per Garmin FIT spec: https://developer.garmin.com/fit/file-types/workout/
 * target_value, custom_target_value_low/high are dynamic aliases whose semantic
 * meaning (and unit) depends on the current target_type value.
 */

export type InputKind = 'text' | 'number' | 'duration' | 'watts' | 'select'

export interface SelectOption {
  label: string
  value: unknown
}

export interface FieldTransformer {
  toDisplay(raw: unknown, row: Record<string, unknown>): string
  toStored(display: string, raw: unknown, row: Record<string, unknown>): unknown
  inputKind: InputKind
  unit?: string
  placeholder?: string
  options?: SelectOption[]
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

// ── Power (stored as watts + 1000 offset per FIT spec) ────────────────────────

function makePowerTransformer(): FieldTransformer {
  return {
    toDisplay: (raw) => {
      const v = typeof raw === 'number' ? raw : Number(raw)
      return isNaN(v) ? String(raw ?? '') : String(v - 1000)
    },
    toStored: (display, raw) => {
      const n = Number(display)
      return isNaN(n) ? raw : n + 1000
    },
    inputKind: 'watts',
    unit: 'W',
    placeholder: '0',
  }
}

// ── Enum select helpers ───────────────────────────────────────────────────────

function makeSelect(options: SelectOption[]): FieldTransformer {
  return {
    toDisplay: (raw) => String(raw ?? ''),
    toStored: (display) => display,
    inputKind: 'select',
    options,
  }
}

// ── Enum option lists (exact strings from fit-file-parser / Garmin FIT SDK) ───

/** wkt_step_target — per Garmin FIT spec */
export const TARGET_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Open (no target)', value: 'open' },
  { label: 'Speed', value: 'speed' },
  { label: 'Heart Rate', value: 'heart_rate' },
  { label: 'Cadence', value: 'cadence' },
  { label: 'Power', value: 'power' },
  { label: 'Grade', value: 'grade' },
  { label: 'Resistance', value: 'resistance' },
]

/** wkt_step_duration — per Garmin FIT SDK */
export const DURATION_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Time', value: 'time' },
  { label: 'Distance', value: 'distance' },
  { label: 'Calories', value: 'calories' },
  { label: 'Open (lap button)', value: 'open' },
  { label: 'HR less than', value: 'hr_less_than' },
  { label: 'HR greater than', value: 'hr_greater_than' },
  { label: 'Power less than', value: 'power_less_than' },
  { label: 'Power greater than', value: 'power_greater_than' },
  { label: 'Repeat until steps complete', value: 'repeat_until_steps_cmplt' },
  { label: 'Repeat until time', value: 'repeat_until_time' },
  { label: 'Repeat until distance', value: 'repeat_until_distance' },
  { label: 'Repeat until calories', value: 'repeat_until_calories' },
  { label: 'Repeat until HR <', value: 'repeat_until_hr_less_than' },
  { label: 'Repeat until HR >', value: 'repeat_until_hr_greater_than' },
  { label: 'Repeat until power <', value: 'repeat_until_power_less_than' },
  { label: 'Repeat until power >', value: 'repeat_until_power_greater_than' },
]

export const INTENSITY_OPTIONS: SelectOption[] = [
  { label: 'Active', value: 'active' },
  { label: 'Rest', value: 'rest' },
  { label: 'Warm Up', value: 'warmup' },
  { label: 'Cool Down', value: 'cooldown' },
]

// ── Target value field metadata by target_type ────────────────────────────────
// Maps target_type → { alias names, unit for custom_target_value_low/high }

interface TargetMeta {
  targetValueAlias: string   // human label for target_value field
  lowAlias: string           // human label for custom_target_value_low
  highAlias: string          // human label for custom_target_value_high
  unit: string
  isPower: boolean           // needs +1000 offset conversion
}

const TARGET_META: Record<string, TargetMeta> = {
  speed: {
    targetValueAlias: 'Target Speed Zone',
    lowAlias: 'Custom Target Speed Low',
    highAlias: 'Custom Target Speed High',
    unit: 'm/s',
    isPower: false,
  },
  heart_rate: {
    targetValueAlias: 'Target HR Zone',
    lowAlias: 'Custom Target Heart Rate Low',
    highAlias: 'Custom Target Heart Rate High',
    unit: 'BPM',
    isPower: false,
  },
  open: {
    targetValueAlias: 'Target Value',
    lowAlias: 'Custom Target Value Low',
    highAlias: 'Custom Target Value High',
    unit: '',
    isPower: false,
  },
  cadence: {
    targetValueAlias: 'Target Cadence Zone',
    lowAlias: 'Custom Target Cadence Low',
    highAlias: 'Custom Target Cadence High',
    unit: 'RPM',
    isPower: false,
  },
  power: {
    targetValueAlias: 'Target Power Zone',
    lowAlias: 'Custom Target Power Low',
    highAlias: 'Custom Target Power High',
    unit: 'W',
    isPower: true,
  },
  grade: {
    targetValueAlias: 'Target Grade',
    lowAlias: 'Custom Target Grade Low',
    highAlias: 'Custom Target Grade High',
    unit: '%',
    isPower: false,
  },
  resistance: {
    targetValueAlias: 'Target Resistance',
    lowAlias: 'Custom Target Resistance Low',
    highAlias: 'Custom Target Resistance High',
    unit: '',
    isPower: false,
  },
}

export function getTargetMeta(targetType: string): TargetMeta {
  return TARGET_META[targetType] ?? TARGET_META['open']!
}

export function getTargetValueUnit(targetType: string): string {
  return getTargetMeta(targetType).unit
}

/**
 * Returns the human-readable alias for target_value, custom_target_value_low,
 * or custom_target_value_high given the current target_type.
 */
export function getTargetFieldLabel(field: string, targetType: string): string | null {
  const meta = getTargetMeta(targetType)
  if (field === 'target_value') return meta.targetValueAlias
  if (field === 'custom_target_value_low') return meta.lowAlias
  if (field === 'custom_target_value_high') return meta.highAlias
  return null
}

// ── Registry ─────────────────────────────────────────────────────────────────

export function getTransformer(
  msgType: string,
  field: string,
  row: Record<string, unknown>,
): FieldTransformer | null {
  if (msgType === 'workout_step') {
    const durationType = String(row['duration_type'] ?? '')
    const targetType = String(row['target_type'] ?? '')
    const meta = getTargetMeta(targetType)

    switch (field) {
      case 'duration_type':    return makeSelect(DURATION_TYPE_OPTIONS)
      case 'target_type':      return makeSelect(TARGET_TYPE_OPTIONS)
      case 'intensity':        return makeSelect(INTENSITY_OPTIONS)
      case 'duration_value':
        if (durationType === 'time') return durationTransformer
        break
      case 'target_value':
      case 'custom_target_value_low':
      case 'custom_target_value_high':
        if (meta.isPower) return makePowerTransformer()
        // For open target_type, the value has no meaning — could hide or show as-is
        break
    }
  }

  return null
}
