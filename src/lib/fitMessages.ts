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
}

export function getMessageTypeEntries(data: ParsedFit): MessageTypeEntry[] {
  return Object.entries(data)
    .filter(([, value]) => Array.isArray(value) && (value as unknown[]).length > 0)
    .map(([key, value]) => ({
      key,
      label: messageLabel(key),
      count: (value as unknown[]).length,
      isSpreadsheet: SPREADSHEET_TYPES.has(key),
    }))
    .sort((a, b) => {
      // records first, then alphabetical
      if (a.key === 'records') return -1
      if (b.key === 'records') return 1
      return a.label.localeCompare(b.label)
    })
}

/** Derive all unique field keys from an array of messages */
export function deriveColumns(messages: Record<string, unknown>[]): string[] {
  const keys = new Set<string>()
  // Sample up to 100 messages to derive columns (performance)
  const sample = messages.length > 100 ? messages.slice(0, 100) : messages
  for (const msg of sample) {
    for (const key of Object.keys(msg)) {
      keys.add(key)
    }
  }
  return Array.from(keys)
}
