import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FileText, Pencil, Trash2 } from 'lucide-react'

const triggers = [
  {
    active: true,
    name: 'daily_batch_refresh',
    pipeline: 'example_pipeline',
    type: 'Schedule',
    frequency: '0 0 * * *',
    latestStatus: 'completed',
    nextRun: '2026-02-24 00:00',
    runs: 18,
    description: 'Nightly data refresh',
    tags: ['nightly'],
    createdAt: '2026-02-20 09:15',
  },
  {
    active: false,
    name: 'event_ingest',
    pipeline: 'streaming_orders',
    type: 'API',
    frequency: 'POST /trigger',
    latestStatus: 'failed',
    nextRun: 'manual',
    runs: 7,
    description: 'Inbound order webhook trigger',
    tags: ['api'],
    createdAt: '2026-02-18 14:02',
  },
]

export default function TriggersPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">Triggers</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <select className="h-8 w-44 rounded-md border border-input bg-background px-2 text-sm">
            <option value="created">Created at</option>
            <option value="updated">Updated at</option>
            <option value="next">Next run date</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Active</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Logs</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Latest status</TableHead>
                <TableHead>Next run date</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Created at</TableHead>
                <TableHead className="text-right">Edit/Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {triggers.map((trigger) => (
                <TableRow key={trigger.name} className="hover:bg-muted/40">
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      {trigger.active ? 'On' : 'Off'}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{trigger.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>{trigger.pipeline}</TableCell>
                  <TableCell>{trigger.type}</TableCell>
                  <TableCell className="font-mono text-xs">{trigger.frequency}</TableCell>
                  <TableCell>
                    <Badge
                      variant={trigger.latestStatus === 'failed' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {trigger.latestStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{trigger.nextRun}</TableCell>
                  <TableCell className="font-mono">{trigger.runs}</TableCell>
                  <TableCell className="max-w-56 truncate text-muted-foreground">
                    {trigger.description}
                  </TableCell>
                  <TableCell>
                    {trigger.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="mr-1 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{trigger.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
