import { Button } from '@/components/ui/button'

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">InspectorFitty</h1>
        <p className="text-muted-foreground">Upload and edit your .fit files</p>
        <Button>Get started</Button>
      </div>
    </div>
  )
}
