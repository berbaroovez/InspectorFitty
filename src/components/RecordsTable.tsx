import { useMemo, useRef, useState, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { deriveColumns } from '@/lib/fitMessages'
import { inferInputType, parseInputValue } from '@/lib/inferInputType'
import type { EditState } from '@/hooks/useEditState'

interface Props {
  messageKey: string
  messages: Record<string, unknown>[]
  editState: EditState
}

interface CellId {
  rowIndex: number
  field: string
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function EditableCell({
  messageKey,
  rowIndex,
  field,
  value,
  editState,
  isEditing,
  onStartEdit,
  onEndEdit,
}: {
  messageKey: string
  rowIndex: number
  field: string
  value: unknown
  editState: EditState
  isEditing: boolean
  onStartEdit: () => void
  onEndEdit: () => void
}) {
  const effective = editState.getEdited(messageKey, rowIndex, field, value)
  const dirty = editState.isDirty(messageKey, rowIndex, field)
  const inputType = inferInputType(value)
  const [draft, setDraft] = useState(formatValue(effective))

  function commit() {
    if (typeof value === 'object' && value !== null) return
    editState.setEdit(messageKey, rowIndex, field, parseInputValue(draft, value))
    onEndEdit()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setDraft(formatValue(effective)); onEndEdit() }
  }

  if (isEditing && !(typeof value === 'object' && value !== null)) {
    return (
      <input
        autoFocus
        type={inputType}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-full text-xs tabular-nums bg-background border border-primary rounded px-1 py-0.5 outline-none"
      />
    )
  }

  return (
    <span
      onClick={onStartEdit}
      className={[
        'block text-xs tabular-nums whitespace-nowrap cursor-text px-1 py-0.5 rounded hover:bg-muted/50 transition-colors',
        dirty ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-medium' : '',
      ].join(' ')}
      title={dirty ? 'Modified' : undefined}
    >
      {formatValue(effective) || <span className="text-muted-foreground/50">—</span>}
    </span>
  )
}

export function RecordsTable({ messageKey, messages, editState }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [editingCell, setEditingCell] = useState<CellId | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const startEdit = useCallback((rowIndex: number, field: string) => {
    setEditingCell({ rowIndex, field })
  }, [])

  const endEdit = useCallback(() => setEditingCell(null), [])

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    return deriveColumns(messages).map((field) => ({
      id: field,
      accessorFn: (row) => row[field],
      header: field.replace(/_/g, ' '),
      cell: (info) => (
        <EditableCell
          messageKey={messageKey}
          rowIndex={info.row.index}
          field={field}
          value={info.getValue()}
          editState={editState}
          isEditing={editingCell?.rowIndex === info.row.index && editingCell?.field === field}
          onStartEdit={() => startEdit(info.row.index, field)}
          onEndEdit={endEdit}
        />
      ),
    }))
  }, [messages, messageKey, editState, editingCell, startEdit, endEdit])

  const table = useReactTable({
    data: messages,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs text-muted-foreground px-1 pb-2">
        {messages.length.toLocaleString()} rows · {columns.length} fields · click any cell to edit
      </div>
      <div ref={parentRef} className="overflow-auto flex-1 rounded-lg border">
        <table className="text-sm border-collapse w-full">
          <thead className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-3 py-2 font-medium text-xs whitespace-nowrap border-b border-r last:border-r-0 cursor-pointer select-none hover:bg-muted-foreground/10"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && ' ↑'}
                    {header.column.getIsSorted() === 'desc' && ' ↓'}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && <tr><td style={{ height: paddingTop }} /></tr>}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index]!
              return (
                <tr key={row.id} className="hover:bg-muted/30 border-b last:border-b-0">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-0.5 border-r last:border-r-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
            {paddingBottom > 0 && <tr><td style={{ height: paddingBottom }} /></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
