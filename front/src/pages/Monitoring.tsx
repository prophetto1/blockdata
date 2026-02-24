import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const statusByType = [
  { type: 'All', completed: 118, failed: 3, running: 3 },
  { type: 'Integration', completed: 30, failed: 1, running: 0 },
  { type: 'Batch', completed: 72, failed: 2, running: 1 },
  { type: 'Streaming', completed: 16, failed: 0, running: 2 },
]

const dailyBars = [
  { date: 'Mon', completed: 12, failed: 1, running: 1 },
  { date: 'Tue', completed: 18, failed: 0, running: 1 },
  { date: 'Wed', completed: 24, failed: 1, running: 0 },
  { date: 'Thu', completed: 21, failed: 0, running: 1 },
  { date: 'Fri', completed: 19, failed: 1, running: 0 },
]

export default function MonitoringPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Monitoring</h1>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="h-8">
          <TabsTrigger value="today" className="px-3 text-xs">
            Today
          </TabsTrigger>
          <TabsTrigger value="week" className="px-3 text-xs">
            Last 7 days
          </TabsTrigger>
          <TabsTrigger value="month" className="px-3 text-xs">
            Last 30 days
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statusByType.map((row) => (
          <Card key={row.type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{row.type}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Completed</span>
                <Badge variant="secondary" className="text-xs">
                  {row.completed}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Failed</span>
                <Badge variant={row.failed > 0 ? 'destructive' : 'secondary'} className="text-xs">
                  {row.failed}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Running</span>
                <Badge variant="secondary" className="text-xs">
                  {row.running}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pipeline runs daily</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dailyBars.map((row) => {
            const total = row.completed + row.failed + row.running

            return (
              <div key={row.date} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.date}</span>
                  <span>{total} runs</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-sm bg-muted">
                  <div
                    className="bg-foreground/70"
                    style={{ width: `${(row.completed / total) * 100}%` }}
                  />
                  <div
                    className="bg-destructive/80"
                    style={{ width: `${(row.failed / total) * 100}%` }}
                  />
                  <div
                    className="bg-amber-500/80"
                    style={{ width: `${(row.running / total) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
