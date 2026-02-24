import { useEffect, useState } from 'react'
import { AlertCircle, Lock, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  fetchProtectedFiles,
  getSpineDashboardApiBase,
  type ProtectedFile,
} from '@/lib/spineDashboardApi'

export default function AdminProtectedFilesPage() {
  const [files, setFiles] = useState<ProtectedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchProtectedFiles()
      setFiles(response.files)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load protected file list.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const existingCount = files.filter((file) => file.exists).length

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Protected files</h1>
          <p className="text-sm text-muted-foreground">
            Read-only inventory for kernel and gate-protected repository files.
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
              <p className="font-medium">Protected-files API unavailable</p>
              <p className="text-xs">Base URL: {getSpineDashboardApiBase()}</p>
              <p className="text-xs">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{files.length} paths</Badge>
        <Badge variant={existingCount === files.length ? 'secondary' : 'outline'}>
          {existingCount} existing
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Protected path inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="table-fixed text-xs">
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="h-8 w-10 px-2 py-1 text-[11px]">Lock</TableHead>
                <TableHead className="h-8 px-2 py-1 text-[11px]">Path</TableHead>
                <TableHead className="h-8 w-24 px-2 py-1 text-[11px]">Exists</TableHead>
                <TableHead className="h-8 w-28 px-2 py-1 text-right text-[11px]">Size (bytes)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.path} className="h-8">
                  <TableCell className="px-2 py-1">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="px-2 py-1 font-mono text-[11px]">
                    <span className="block truncate" title={file.path}>
                      {file.path}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <Badge variant={file.exists ? 'secondary' : 'destructive'} className="px-1.5 py-0 text-[10px]">
                      {file.exists ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right font-mono text-[11px]">
                    {file.size_bytes == null ? '-' : file.size_bytes.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && files.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
                    No protected files were returned.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
