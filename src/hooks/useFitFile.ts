import { useState, useCallback } from 'react'
import { parseFitFile } from '@/lib/parseFit'
import type { ParsedFit } from '@/lib/parseFit'

type State =
  | { status: 'idle' }
  | { status: 'parsing' }
  | { status: 'ready'; data: ParsedFit; fileName: string }
  | { status: 'error'; message: string }

export function useFitFile() {
  const [state, setState] = useState<State>({ status: 'idle' })

  const load = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.fit')) {
      setState({ status: 'error', message: 'File must be a .fit file' })
      return
    }

    setState({ status: 'parsing' })
    try {
      const data = await parseFitFile(file)
      setState({ status: 'ready', data, fileName: file.name })
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to parse file',
      })
    }
  }, [])

  const reset = useCallback(() => setState({ status: 'idle' }), [])

  return { state, load, reset }
}
