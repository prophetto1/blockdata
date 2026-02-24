import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const changes = [
  { status: 'M', path: 'pipelines/orders_daily.py' },
  { status: 'U', path: 'templates/ingest/stripe.yaml' },
  { status: 'S', path: 'blocks/transform_cleanse.ts' },
]

export default function VersionControlPage() {
  const [tab, setTab] = useState('remote')

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Version control</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="remote" className="px-3 text-xs">
            Remote &amp; Auth
          </TabsTrigger>
          <TabsTrigger value="branches" className="px-3 text-xs">
            Branches
          </TabsTrigger>
          <TabsTrigger value="commit" className="px-3 text-xs">
            Commit
          </TabsTrigger>
          <TabsTrigger value="push" className="px-3 text-xs">
            Push &amp; Pull Requests
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'remote' && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1">
              <Label>Remote name</Label>
              <Input defaultValue="origin" />
            </div>
            <div className="space-y-1">
              <Label>Repository</Label>
              <Input placeholder="git@github.com:org/repo.git" />
            </div>
            <div className="space-y-1">
              <Label>Auth token</Label>
              <Input type="password" placeholder="Personal access token" />
            </div>
            <div className="flex gap-2">
              <Button size="sm">Save remote</Button>
              <Button size="sm" variant="outline">
                Test connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'branches' && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last commit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">main</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      current
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">a91f0c2</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">
                      Fetch
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">feature/templates-v2</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      remote
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">d9ab6fe</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">
                      Checkout
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'commit' && (
        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-5">
            <CardContent className="space-y-3 p-4">
              <p className="text-sm font-medium">Changed files</p>
              {changes.map((file) => (
                <div key={file.path} className="flex items-center justify-between rounded-sm border px-3 py-2">
                  <span className="truncate text-sm">{file.path}</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {file.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="col-span-7">
            <CardContent className="space-y-3 p-4">
              <Label htmlFor="commit-message">Commit message</Label>
              <textarea
                id="commit-message"
                className="h-36 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                placeholder="Describe your changes"
                defaultValue={'Align templates and data product pages to Mage parity.'}
              />
              <div className="flex gap-2">
                <Button size="sm">Commit staged</Button>
                <Button size="sm" variant="outline">
                  Stage all
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'push' && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between rounded-sm border px-3 py-2">
              <span className="text-sm">Local branch</span>
              <span className="font-mono text-xs">feature/templates-v2</span>
            </div>
            <div className="flex items-center justify-between rounded-sm border px-3 py-2">
              <span className="text-sm">Remote branch</span>
              <span className="font-mono text-xs">origin/feature/templates-v2</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm">Push</Button>
              <Button size="sm" variant="outline">
                Pull
              </Button>
              <Button size="sm" variant="outline">
                Open pull request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
