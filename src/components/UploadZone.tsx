import { useRef, useState, type DragEvent } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

export function UploadZone({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={[
        'flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'border-border',
        disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50',
      ].join(' ')}
      onClick={() => inputRef.current?.click()}
    >
      <div className="text-4xl">📂</div>
      <div className="text-center">
        <p className="font-medium">Drop a .fit file here</p>
        <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
      </div>
      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
        Choose file
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".fit"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
