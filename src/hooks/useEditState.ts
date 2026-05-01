import { useState, useCallback } from 'react'

type FieldEdits = Record<string, unknown>
type RowEdits = Record<number, FieldEdits>
type EditMap = Record<string, RowEdits>

export interface EditState {
  edits: EditMap
  setEdit: (msgType: string, rowIndex: number, field: string, value: unknown) => void
  getEdited: (msgType: string, rowIndex: number, field: string, original: unknown) => unknown
  isDirty: (msgType: string, rowIndex: number, field: string) => boolean
  hasEdits: boolean
  clear: () => void
}

export function useEditState(): EditState {
  const [edits, setEdits] = useState<EditMap>({})

  const setEdit = useCallback((msgType: string, rowIndex: number, field: string, value: unknown) => {
    setEdits((prev) => ({
      ...prev,
      [msgType]: {
        ...prev[msgType],
        [rowIndex]: {
          ...prev[msgType]?.[rowIndex],
          [field]: value,
        },
      },
    }))
  }, [])

  const getEdited = useCallback(
    (msgType: string, rowIndex: number, field: string, original: unknown) => {
      const edited = edits[msgType]?.[rowIndex]
      if (edited && field in edited) return edited[field]
      return original
    },
    [edits],
  )

  const isDirty = useCallback(
    (msgType: string, rowIndex: number, field: string) =>
      edits[msgType]?.[rowIndex] !== undefined && field in (edits[msgType][rowIndex] ?? {}),
    [edits],
  )

  const hasEdits = Object.keys(edits).length > 0

  const clear = useCallback(() => setEdits({}), [])

  return { edits, setEdit, getEdited, isDirty, hasEdits, clear }
}
