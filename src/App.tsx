import { useFitFile } from '@/hooks/useFitFile'
import { UploadZone } from '@/components/UploadZone'
import { FileEditor } from '@/components/FileEditor'

export default function App() {
  const { state, load, reset } = useFitFile()

  if (state.status === 'ready') {
    return <FileEditor fileName={state.fileName} data={state.data} onReset={reset} />
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-bold">InspectorFitty</h1>
      </header>

      <main className="flex flex-col items-center justify-center px-6 py-16">
        {(state.status === 'idle' || state.status === 'parsing') && (
          <div className="w-full max-w-lg space-y-4">
            <UploadZone onFile={load} disabled={state.status === 'parsing'} />
            {state.status === 'parsing' && (
              <p className="text-center text-sm text-muted-foreground">Parsing file…</p>
            )}
          </div>
        )}

        {state.status === 'error' && (
          <div className="w-full max-w-lg space-y-4">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive text-sm">
              {state.message}
            </div>
            <UploadZone onFile={load} />
          </div>
        )}
      </main>
    </div>
  )
}
