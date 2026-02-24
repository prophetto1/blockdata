import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronDown, MoreHorizontal, Search } from 'lucide-react'

const currentRuns = [
  {
    status: 'completed',
    pipeline: 'example_pipeline',
    trigger: 'daily_batch_refresh',
    executionDate: '2026-02-23 08:00',
    nextRun: '2026-02-24 00:00',
    expectedRuntime: '2m 10s',
  },
  {
    status: 'running',
    pipeline: 'streaming_orders',
    trigger: 'interval_5m',
    executionDate: '2026-02-23 08:07',
    nextRun: '2026-02-23 08:12',
    expectedRuntime: 'in progress',
  },
  {
    status: 'failed',
    pipeline: 'warehouse_sync',
    trigger: 'hourly_sync',
    executionDate: '2026-02-23 07:00',
    nextRun: '2026-02-23 08:00',
    expectedRuntime: '31s',
  },
]

function statusVariant(status: string): 'default' | 'destructive' | 'secondary' {
  if (status === 'failed') {
    return 'destructive'
  }
  if (status === 'running') {
    return 'secondary'
  }
  return 'default'
}

export default function RunsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Runs</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline">
          Status
          <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline">
          Pipeline
          <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline">
          Tag
          <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
        <div className="ml-auto flex w-full items-center gap-2 md:w-80">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search runs" className="h-8" />
        </div>
      </div>

      <Tabs defaultValue="current">
        <TabsList className="h-8">
          <TabsTrigger value="current" className="px-3 text-xs">
            Current and past
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="px-3 text-xs">
            Upcoming
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Execution date</TableHead>
                <TableHead>Next run</TableHead>
                <TableHead>Expected runtime</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentRuns.map((run) => (
                <TableRow key={`${run.pipeline}-${run.executionDate}`} className="hover:bg-muted/40">
                  <TableCell>
                    <Badge variant={statusVariant(run.status)} className="text-xs">
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{run.pipeline}</TableCell>
                  <TableCell>{run.trigger}</TableCell>
                  <TableCell className="font-mono text-xs">{run.executionDate}</TableCell>
                  <TableCell className="font-mono text-xs">{run.nextRun}</TableCell>
                  <TableCell>{run.expectedRuntime}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Retry run</DropdownMenuItem>
                        <DropdownMenuItem>Cancel run</DropdownMenuItem>
                        <DropdownMenuItem>Delete run</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
