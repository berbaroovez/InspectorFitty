import { useState } from 'react'
import type { ParsedFit } from '@/lib/parseFit'
import { getMessageTypeEntries, SPREADSHEET_TYPES } from '@/lib/fitMessages'
import { useEditState } from '@/hooks/useEditState'
import { RecordsTable } from '@/components/RecordsTable'
import { MessageForm } from '@/components/MessageForm'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

interface Props {
  fileName: string
  data: ParsedFit
  onReset: () => void
}

export function FileEditor({ fileName, data, onReset }: Props) {
  const entries = getMessageTypeEntries(data)
  const [selected, setSelected] = useState(entries[0]?.key ?? '')
  const editState = useEditState()

  const selectedEntry = entries.find((e) => e.key === selected)
  const messages = (data[selected as keyof ParsedFit] as Record<string, unknown>[] | undefined) ?? []

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-lg">InspectorFitty</h1>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-medium truncate max-w-xs">{fileName}</span>
          {editState.hasEdits && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-400">
              Unsaved edits
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            Close file
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-1.5">
                Message types
              </p>
              {entries.map((entry) => {
                const hasTypeEdits = editState.edits[entry.key] !== undefined
                return (
                  <button
                    key={entry.key}
                    onClick={() => setSelected(entry.key)}
                    className={[
                      'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors',
                      entry.key === selected
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {entry.label}
                      {hasTypeEdits && (
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                      )}
                    </span>
                    <Badge
                      variant={entry.key === selected ? 'outline' : 'secondary'}
                      className="ml-2 shrink-0 text-xs"
                    >
                      {entry.count}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 p-4 flex flex-col">
          {selectedEntry && (
            <>
              {SPREADSHEET_TYPES.has(selected) ? (
                <RecordsTable
                  messageKey={selected}
                  messages={messages}
                  editState={editState}
                />
              ) : (
                <MessageForm
                  messageKey={selected}
                  messages={messages}
                  editState={editState}
                />
              )}
            </>
          )}
          {!selectedEntry && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a message type
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
