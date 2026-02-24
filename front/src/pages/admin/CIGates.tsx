import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, RefreshCw, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fetchGates, getSpineDashboardApiBase, runGate, type Gate } from '@/lib/spineDashboardApi'

type GateOutputMap = Record<string, string>

function getGateStatus(gate: Gate) {
  if (!gate.last_run) {
    return { label: 'Not run', variant: 'outline' as const }
  }
  if (gate.last_run.passed) {
    return { label: 'Pass', variant: 'secondary' as const }
  }
  return { label: 'Fail', variant: 'destructive' as const }
}

export default function AdminCIGatesPage() {
  const [gates, setGates] = useState<Gate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningGate, setRunningGate] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<GateOutputMap>({})

  async function load() {
    try {
      const response = await fetchGates()
      setGates(response.gates)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load gate status.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => {
      void load()
    }, 3000)
    return () => {
      window.clearInterval(interval)
    }
  }, [])

  async function run(name: string) {
    try {
      setRunningGate(name)
      const result = await runGate(name)
      setOutputs((prev) => ({ ...prev, [name]: result.output || '(No output)' }))
      await load()
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to run ${name}.`
      setOutputs((prev) => ({ ...prev, [name]: message }))
    } finally {
      setRunningGate(null)
    }
  }

  const sorted = useMemo(
    () => [...gates].sort((a, b) => a.label.localeCompare(b.label)),
    [gates],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">CI gates</h1>
          <p className="text-sm text-muted-foreground">
            Local gate runner and status tracker for spine safety checks.
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
              <p className="font-medium">Gate API unavailable</p>
              <p className="text-xs">Base URL: {getSpineDashboardApiBase()}</p>
              <p className="text-xs">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {sorted.map((gate) => {
          const status = getGateStatus(gate)
          const lastRunLabel = gate.last_run
            ? `${new Date(gate.last_run.ran_at).toLocaleString()} (${gate.last_run.duration_ms} ms)`
            : 'Never run locally'

          return (
            <Card key={gate.name}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-sm">
                  <span>{gate.label}</span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="font-mono text-muted-foreground">{gate.script_path}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={gate.exists ? 'secondary' : 'destructive'}>
                    {gate.exists ? 'Present' : 'Missing'}
                  </Badge>
                  <Badge variant={gate.runnable ? 'secondary' : 'outline'}>
                    {gate.runnable ? 'Runnable' : 'CI only'}
                  </Badge>
                </div>
                <p className="text-muted-foreground">Last run: {lastRunLabel}</p>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={!gate.runnable || runningGate === gate.name}
                  onClick={() => void run(gate.name)}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  {runningGate === gate.name ? 'Running...' : 'Run gate'}
                </Button>

                {outputs[gate.name] && (
                  <details className="rounded-sm border border-border/80 bg-muted/30 p-2">
                    <summary className="cursor-pointer text-xs font-medium">Latest output</summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px]">
                      {outputs[gate.name]}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
