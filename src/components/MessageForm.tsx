import { useState } from 'react'
import { messageLabel } from '@/lib/fitMessages'
import { inferInputType, parseInputValue } from '@/lib/inferInputType'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { EditState } from '@/hooks/useEditState'

interface Props {
  messageKey: string
  messages: Record<string, unknown>[]
  editState: EditState
}

function formatDisplay(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function FieldRow({
  messageKey,
  rowIndex,
  fieldKey,
  value,
  editState,
}: {
  messageKey: string
  rowIndex: number
  fieldKey: string
  value: unknown
  editState: EditState
}) {
  const isComplex = typeof value === 'object' && value !== null
  const effective = editState.getEdited(messageKey, rowIndex, fieldKey, value)
  const dirty = editState.isDirty(messageKey, rowIndex, fieldKey)
  const inputType = inferInputType(value)

  function handleChange(raw: string) {
    editState.setEdit(messageKey, rowIndex, fieldKey, parseInputValue(raw, value))
  }

  return (
    <div className={[
      'grid grid-cols-2 gap-4 py-2.5 border-b last:border-b-0 items-start',
      dirty ? 'bg-yellow-500/5' : '',
    ].join(' ')}>
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <span>{fieldKey.replace(/_/g, ' ')}</span>
        {dirty && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" title="Modified" />}
      </div>
      <div>
        {isComplex ? (
          <pre className="text-xs font-mono break-all whitespace-pre-wrap text-muted-foreground">
            {formatDisplay(effective)}
          </pre>
        ) : (
          <input
            type={inputType}
            value={formatDisplay(effective)}
            onChange={(e) => handleChange(e.target.value)}
            className={[
              'w-full text-sm bg-transparent border border-transparent rounded px-1.5 py-0.5',
              'hover:border-border focus:border-primary focus:outline-none transition-colors',
              dirty ? 'font-medium text-yellow-700 dark:text-yellow-400' : '',
            ].join(' ')}
          />
        )}
      </div>
    </div>
  )
}

export function MessageForm({ messageKey, messages, editState }: Props) {
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
              <FieldRow
                key={key}
                messageKey={messageKey}
                rowIndex={selectedIndex}
                fieldKey={key}
                value={value}
                editState={editState}
              />
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
