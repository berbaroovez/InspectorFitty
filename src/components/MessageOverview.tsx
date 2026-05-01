import { getMessageTypes } from '@/lib/parseFit'
import type { ParsedFit } from '@/lib/parseFit'
import { Button } from '@/components/ui/button'

const LABEL: Record<string, string> = {
  records: 'Records (per-second data)',
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

function label(key: string) {
  return LABEL[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface Props {
  fileName: string
  data: ParsedFit
  onReset: () => void
}

export function MessageOverview({ fileName, data, onReset }: Props) {
  const types = getMessageTypes(data)

  return (
    <div className="w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{fileName}</h2>
          <p className="text-sm text-muted-foreground">{types.length} message types found</p>
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          Load another file
        </Button>
      </div>

      <div className="rounded-lg border divide-y">
        {types.map(({ key, count }) => (
          <div key={key} className="flex items-center justify-between px-4 py-3">
            <span className="font-medium">{label(key)}</span>
            <span className="text-sm text-muted-foreground tabular-nums">{count.toLocaleString()} message{count !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
