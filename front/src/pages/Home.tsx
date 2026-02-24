import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChevronDown,
  Sparkles,
  ListChecks,
  Factory,
  Waves,
  CircleAlert,
  Activity,
} from 'lucide-react'

const timeRanges = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
]

const runSummaries = [
  { label: 'Pipeline runs', value: 124, icon: ListChecks },
  { label: 'Integration pipelines', value: 31, icon: Factory },
  { label: 'Standard pipelines', value: 76, icon: Activity },
  { label: 'Streaming pipelines', value: 17, icon: Waves },
]

const failureRows = [
  { type: 'Integration pipelines', failed: 1, running: 0 },
  { type: 'Batch pipelines', failed: 2, running: 1 },
  { type: 'Streaming pipelines', failed: 0, running: 1 },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Home</h1>
          <p className="text-sm text-muted-foreground">
            Workspace overview and recent activity.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              New pipeline
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>Standard (batch)</DropdownMenuItem>
            <DropdownMenuItem>Data integration</DropdownMenuItem>
            <DropdownMenuItem>Streaming</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/apps/pipelines/templates">From a template</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Import pipeline zip</DropdownMenuItem>
            <DropdownMenuItem>Using AI (beta)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="h-8">
          {timeRanges.map((range) => (
            <TabsTrigger key={range.value} value={range.value} className="px-3 text-xs">
              {range.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {runSummaries.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Failed runs by pipeline type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {failureRows.map((row) => (
            <div
              key={row.type}
              className="flex items-center justify-between rounded-sm border border-border/80 px-3 py-2"
            >
              <span className="text-sm">{row.type}</span>
              <div className="flex items-center gap-2">
                <Badge variant={row.failed > 0 ? 'destructive' : 'secondary'} className="text-xs">
                  failed {row.failed}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  running {row.running}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Meet your AI Sidekick</p>
              <p className="text-xs text-muted-foreground">
                Configure AI-assisted pipeline generation from workspace settings.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline">
            <CircleAlert className="mr-1.5 h-3.5 w-3.5" />
            Setup
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
