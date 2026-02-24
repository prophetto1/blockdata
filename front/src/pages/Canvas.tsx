import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FlowCanvas from '@/shell/FlowCanvas'

const graphStats = [
  { label: 'Pipelines', value: 42 },
  { label: 'Dependencies', value: 118 },
  { label: 'Active triggers', value: 26 },
]

export default function CanvasPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Pipeline graph</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="h-8 rounded-md border border-input bg-background px-2 text-sm">
          <option>All pipelines</option>
          <option>Batch</option>
          <option>Integration</option>
          <option>Streaming</option>
        </select>
        <select className="h-8 rounded-md border border-input bg-background px-2 text-sm">
          <option>With dependencies</option>
          <option>Without dependencies</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline">
            Reset zoom
          </Button>
          <Button size="sm" variant="outline">
            Center view
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {graphStats.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{item.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-2xl font-semibold">{item.value}</CardContent>
          </Card>
        ))}
      </div>

      <div className="h-[68vh] overflow-hidden rounded-sm border border-border">
        <FlowCanvas />
      </div>
    </div>
  )
}
