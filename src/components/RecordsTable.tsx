import { useMemo, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useState } from 'react'
import { deriveColumns } from '@/lib/fitMessages'

interface Props {
  messages: Record<string, unknown>[]
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function RecordsTable({ messages }: Props) {
  const [sorting, setSorting] = useState<SortingState>([])
  const parentRef = useRef<HTMLDivElement>(null)

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    return deriveColumns(messages).map((key) => ({
      id: key,
      accessorFn: (row) => row[key],
      header: key.replace(/_/g, ' '),
      cell: (info) => (
        <span className="text-xs tabular-nums whitespace-nowrap">
          {formatValue(info.getValue())}
        </span>
      ),
    }))
  }, [messages])

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
        {messages.length.toLocaleString()} rows · {columns.length} fields
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
            {paddingTop > 0 && (
              <tr><td style={{ height: paddingTop }} /></tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index]!
              return (
                <tr key={row.id} className="hover:bg-muted/50 border-b last:border-b-0">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-1.5 border-r last:border-r-0">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              )
            })}
            {paddingBottom > 0 && (
              <tr><td style={{ height: paddingBottom }} /></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
