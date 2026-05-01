import { useState } from 'react'
import { messageLabel } from '@/lib/fitMessages'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Props {
  messageKey: string
  messages: Record<string, unknown>[]
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function FieldRow({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  return (
    <div className="grid grid-cols-2 gap-4 py-2.5 border-b last:border-b-0 items-start">
      <div className="text-sm font-medium text-muted-foreground">
        {fieldKey.replace(/_/g, ' ')}
      </div>
      <div className="text-sm font-mono break-all">
        {formatValue(value)}
      </div>
    </div>
  )
}

export function MessageForm({ messageKey, messages }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = messages[selectedIndex] ?? {}

  return (
    <div className="flex h-full gap-4">
      {messages.length > 1 && (
        <div className="w-48 shrink-0">
          <ScrollArea className="h-full rounded-lg border">
            <div className="p-1">
              {messages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={[
                    'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                    i === selectedIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  ].join(' ')}
                >
                  {messageLabel(messageKey)} {i + 1}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-medium">{messageLabel(messageKey)}</h3>
          {messages.length > 1 && (
            <Badge variant="secondary">{selectedIndex + 1} / {messages.length}</Badge>
          )}
        </div>
        <ScrollArea className="h-full rounded-lg border px-4">
          <div className="py-2">
            {Object.entries(selected).map(([key, value]) => (
              <FieldRow key={key} fieldKey={key} value={value} />
            ))}
            {Object.keys(selected).length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No fields</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
