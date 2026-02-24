import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  fetchDispatch,
  getSpineDashboardApiBase,
  type DispatchResponse,
} from '@/lib/spineDashboardApi'

export default function AdminExecutorsPage() {
  const [data, setData] = useState<DispatchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchDispatch()
      setData(response)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load executor mappings.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Executors</h1>
          <p className="text-sm text-muted-foreground">
            Pipeline and block executor dispatch mappings.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-2 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-medium">Executor API unavailable</p>
              <p className="text-xs">Base URL: {getSpineDashboardApiBase()}</p>
              <p className="text-xs">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pipeline executor dispatch</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="table-fixed text-xs">
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="h-8 px-2 py-1 text-[11px]">Case</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-[11px]">Resolved class</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data?.executor_dispatch.pipeline || {}).map(([name, klass]) => (
                  <TableRow key={name} className="h-8">
                    <TableCell className="px-2 py-1 font-mono text-[11px]">{name}</TableCell>
                    <TableCell className="px-2 py-1 font-mono text-[11px]">
                      <span className="block max-w-[420px] truncate" title={klass}>
                        {klass}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && Object.keys(data?.executor_dispatch.pipeline || {}).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="px-2 py-2 text-center text-xs text-muted-foreground">
                      No pipeline executor mappings found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Block executor dispatch</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="table-fixed text-xs">
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="h-8 px-2 py-1 text-[11px]">Case</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-[11px]">Resolved class</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data?.executor_dispatch.block || {}).map(([name, klass]) => (
                  <TableRow key={name} className="h-8">
                    <TableCell className="px-2 py-1 font-mono text-[11px]">{name}</TableCell>
                    <TableCell className="px-2 py-1 font-mono text-[11px]">
                      <span className="block max-w-[420px] truncate" title={klass}>
                        {klass}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && Object.keys(data?.executor_dispatch.block || {}).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="px-2 py-2 text-center text-xs text-muted-foreground">
                      No block executor mappings found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
