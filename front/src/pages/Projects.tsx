import { Link } from 'react-router-dom'
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
import {
  ChevronDown,
  CirclePause,
  CirclePlay,
  MoreHorizontal,
  Search,
} from 'lucide-react'

type PipelineRow = {
  name: string
  status: 'active' | 'inactive' | 'no schedules'
  description: string
  type: 'Batch' | 'Integration' | 'Streaming'
  updatedAt: string
  createdAt: string
  tags: string[]
  blocks: number
  triggers: number
}

const rows: PipelineRow[] = [
  {
    name: 'example_pipeline',
    status: 'active',
    description: 'Starter pipeline for ingestion and transform.',
    type: 'Batch',
    updatedAt: '2026-02-23 08:12',
    createdAt: '2026-02-20 15:08',
    tags: ['starter'],
    blocks: 6,
    triggers: 1,
  },
  {
    name: 'streaming_orders',
    status: 'inactive',
    description: 'Order event processing and near real-time enrichments.',
    type: 'Streaming',
    updatedAt: '2026-02-23 07:44',
    createdAt: '2026-02-18 10:31',
    tags: ['events', 'priority'],
    blocks: 8,
    triggers: 2,
  },
]

const rowActionLabels = [
  'Edit description',
  'Rename',
  'Clone',
  'Download (keep folder structure)',
  'Download (without folder structure)',
  'Add/Remove tags',
  'Create template',
  'Create global data product',
  'Delete',
]

function StatusCell({ status }: { status: PipelineRow['status'] }) {
  if (status === 'active') {
    return <Badge className="text-xs">active</Badge>
  }

  if (status === 'inactive') {
    return <Badge variant="secondary" className="text-xs">inactive</Badge>
  }

  return <Badge variant="outline" className="text-xs">no schedules</Badge>
}

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Pipelines</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link to="/apps/pipelines/templates">New pipeline</Link>
        </Button>
        <Button size="sm" variant="outline">
          Filter
          <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="outline">
          Group
          <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
        <div className="ml-auto flex w-full items-center gap-2 md:w-80">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search pipelines" className="h-8" />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="h-8">
          <TabsTrigger value="all" className="px-3 text-xs">
            All pipelines &gt; {rows.length}
          </TabsTrigger>
          <TabsTrigger value="recent" className="px-3 text-xs">
            Recently viewed
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Updated at</TableHead>
                <TableHead>Created at</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Blocks</TableHead>
                <TableHead className="text-right">Triggers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.name} className="hover:bg-muted/40">
                  <TableCell className="w-16">
                    {row.status === 'active' ? (
                      <CirclePause className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <CirclePlay className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusCell status={row.status} />
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="max-w-72 truncate text-muted-foreground">
                    {row.description}
                  </TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell className="font-mono text-xs">{row.updatedAt}</TableCell>
                  <TableCell className="font-mono text-xs">{row.createdAt}</TableCell>
                  <TableCell>
                    {row.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="mr-1 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell className="text-right font-mono">{row.blocks}</TableCell>
                  <TableCell className="text-right font-mono">{row.triggers}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-60">
                        {rowActionLabels.map((label) => (
                          <DropdownMenuItem key={label}>{label}</DropdownMenuItem>
                        ))}
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
