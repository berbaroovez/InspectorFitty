import FitParser from 'fit-file-parser'
import { scanFitMessages } from './fitScanner'

export type ParsedFit = Awaited<ReturnType<FitParser['parseAsync']>> & {
  [key: string]: unknown
}

// Global message numbers that fit-file-parser drops via default: obj[type] = msg (overwrites)
// These need to be accumulated via the scanner instead.
const KNOWN_HANDLED = new Set([
  'lap', 'session', 'event', 'length', 'hrv', 'hr_zone', 'power_zone', 'record',
  'field_description', 'device_info', 'developer_data_id', 'dive_gas', 'course_point',
  'sport', 'file_id', 'definition', 'monitoring', 'monitoring_info', 'stress_level',
  'software', 'tank_update', 'tank_summary', 'jump', 'time_in_zone', 'activity_metrics',
  'activity',
])

export async function parseFitFile(file: File): Promise<ParsedFit> {
  const buffer = await file.arrayBuffer()
  const parser = new FitParser({ force: true, mode: 'list' })
  const base = await parser.parseAsync(buffer) as ParsedFit

  // Find keys that were overwritten (plain objects, not arrays, not scalar)
  const overwritten = Object.entries(base).filter(([key, v]) =>
    !KNOWN_HANDLED.has(key) &&
    v !== null && v !== undefined &&
    typeof v === 'object' && !Array.isArray(v)
  )

  if (overwritten.length > 0) {
    // Map overwritten message names back to global message numbers
    const NAME_TO_NUM: Record<string, number> = {
      workout: 26, workout_step: 27, file_creator: 49, goal: 15,
      bike_profile: 6, user_profile: 3, device_settings: 2, zones_target: 7,
      training_file: 72, watchface_settings: 160, course: 31,
    }
    const targetNums = new Set(
      overwritten.map(([k]) => NAME_TO_NUM[k]).filter((n): n is number => n !== undefined)
    )

    if (targetNums.size > 0) {
      const scanned = scanFitMessages(buffer, targetNums)
      for (const [key, messages] of Object.entries(scanned)) {
        if (messages.length > 0) {
          (base as Record<string, unknown>)[key] = messages
        }
      }
    }
  }

  normalizeWorkoutSteps(base)
  return base
}

/**
 * Normalize workout_step power values from FIT binary encoding to human watts.
 *
 * FIT spec stores power targets as (watts + 1000) to avoid zero/invalid sentinel.
 * We strip this offset at parse time so the data model and UI always deal with
 * real watt values. The export layer adds 1000 back when writing the binary.
 */
function normalizeWorkoutSteps(data: ParsedFit) {
  const steps = data['workout_step']
  if (!Array.isArray(steps)) return

  for (const step of steps as Record<string, unknown>[]) {
    if (step['target_type'] !== 'power') continue
    for (const field of ['target_value', 'custom_target_value_low', 'custom_target_value_high']) {
      const v = step[field]
      if (typeof v === 'number' && v >= 1000) {
        step[field] = v - 1000
      }
    }
  }
}

/** Returns all message type keys that have at least one entry */
export function getMessageTypes(data: ParsedFit): Array<{ key: string; count: number }> {
  return Object.entries(data)
    .filter(([, value]) => Array.isArray(value) && value.length > 0)
    .map(([key, value]) => ({ key, count: (value as unknown[]).length }))
    .sort((a, b) => b.count - a.count)
}
