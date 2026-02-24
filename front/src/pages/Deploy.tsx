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
import { Copy, ExternalLink } from 'lucide-react'

const rows = [
  {
    configuration: 'default_repo',
    project: '/home/src/default_repo',
    repository: '',
    branch: '',
  },
]

export default function DeployPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Deploy</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Configuration</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.configuration}>
                  <TableCell className="font-medium">{row.configuration}</TableCell>
                  <TableCell className="font-mono text-xs">{row.project}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.repository || '\u2014'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.branch || '\u2014'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy settings
                      </Button>
                      <Button size="sm">
                        Open deployment settings
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
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
