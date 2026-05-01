import type { ParsedFit } from './parseFit'

/** Message types rendered as a spreadsheet (time-series rows) */
export const SPREADSHEET_TYPES = new Set(['records', 'lengths', 'monitors', 'stress'])

/** Human-readable label for a message type key */
const LABELS: Record<string, string> = {
  records: 'Records',
  laps: 'Laps',
  sessions: 'Sessions',
  events: 'Events',
  device_infos: 'Device Info',
  file_ids: 'File IDs',
  hrv: 'HRV',
  hr_zone: 'HR Zones',
  power_zone: 'Power Zones',
  lengths: 'Lengths',
  sports: 'Sports',
  monitors: 'Monitors',
  stress: 'Stress',
  course_points: 'Course Points',
  dive_gases: 'Dive Gases',
  developer_data_ids: 'Developer Data IDs',
  field_descriptions: 'Field Descriptions',
  devices: 'Devices',
  definitions: 'Definitions',
  monitor_info: 'Monitor Info',
  tank_updates: 'Tank Updates',
  tank_summaries: 'Tank Summaries',
}

export function messageLabel(key: string): string {
  return LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface MessageTypeEntry {
  key: string
  label: string
  count: number
  isSpreadsheet: boolean
  /** true if the raw value is a plain object (not an array) */
  isSingleObject: boolean
}

/** Primitive keys that are not message types */
const SCALAR_KEYS = new Set(['protocolVersion', 'profileVersion'])

export function getMessageTypeEntries(data: ParsedFit): MessageTypeEntry[] {
  const entries: MessageTypeEntry[] = []

  for (const [key, value] of Object.entries(data)) {
    if (SCALAR_KEYS.has(key) || value === null || value === undefined) continue

    if (Array.isArray(value)) {
      if ((value as unknown[]).length === 0) continue
      entries.push({
        key,
        label: messageLabel(key),
        count: (value as unknown[]).length,
        isSpreadsheet: SPREADSHEET_TYPES.has(key),
        isSingleObject: false,
      })
    } else if (typeof value === 'object') {
      // Plain object — single message (e.g. workout, workout_step, file_creator)
      entries.push({
        key,
        label: messageLabel(key),
        count: 1,
        isSpreadsheet: false,
        isSingleObject: true,
      })
    }
  }

  return entries.sort((a, b) => {
    if (a.key === 'records') return -1
    if (b.key === 'records') return 1
    return a.label.localeCompare(b.label)
  })
}

/** Derive all unique field keys from an array of messages — scans ALL rows */
export function deriveColumns(messages: Record<string, unknown>[]): string[] {
  const keys = new Set<string>()
  for (const msg of messages) {
    for (const key of Object.keys(msg)) {
      keys.add(key)
    }
  }
  return Array.from(keys)
}
