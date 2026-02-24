import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Save, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  fetchProgress,
  getSpineDashboardApiBase,
  saveProgress,
  type ProgressItem,
  type ProgressPhase,
  type ProgressResponse,
} from '@/lib/spineDashboardApi'

function clonePhases(phases: ProgressPhase[]) {
  return phases.map((phase) => ({
    ...phase,
    items: phase.items.map((item) => ({ ...item })),
  }))
}

export default function AdminProgressPage() {
  const [state, setState] = useState<ProgressResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveNote, setSaveNote] = useState<string | null>(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchProgress()
      setState(response)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load progress state.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const completion = useMemo(() => {
    let total = 0
    let done = 0
    for (const phase of state?.phases || []) {
      for (const item of phase.items) {
        total += 1
        if (item.done) {
          done += 1
        }
      }
    }
    return { total, done }
  }, [state])

  function updateItem(phaseIndex: number, itemIndex: number, updater: (item: ProgressItem) => ProgressItem) {
    setState((current) => {
      if (!current) {
        return current
      }
      const phases = clonePhases(current.phases)
      phases[phaseIndex].items[itemIndex] = updater(phases[phaseIndex].items[itemIndex])
      return {
        ...current,
        phases,
      }
    })
  }

  function addPhase() {
    setState((current) => {
      if (!current) {
        return current
      }
      const phases = clonePhases(current.phases)
      phases.push({
        name: `Phase ${phases.length + 1}`,
        items: [{ name: 'New item', done: false }],
      })
      return {
        ...current,
        phases,
      }
    })
  }

  function addItem(phaseIndex: number) {
    setState((current) => {
      if (!current) {
        return current
      }
      const phases = clonePhases(current.phases)
      phases[phaseIndex].items.push({ name: 'New item', done: false })
      return {
        ...current,
        phases,
      }
    })
  }

  async function save() {
    if (!state) {
      return
    }
    try {
      setSaving(true)
      setError(null)
      const response = await saveProgress(state.phases)
      setState(response)
      const updated = response.updated_at
        ? new Date(response.updated_at).toLocaleString()
        : 'just now'
      setSaveNote(`Saved ${updated}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save progress state.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Migration progress</h1>
          <p className="text-sm text-muted-foreground">
            Editable checklist persisted to the dashboard progress state.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving || !state}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex items-start gap-2 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4" />
            <div>
              <p className="font-medium">Progress API unavailable</p>
              <p className="text-xs">Base URL: {getSpineDashboardApiBase()}</p>
              <p className="text-xs">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {completion.done}/{completion.total} complete
        </Badge>
        <Badge variant="secondary">schema v{state?.schema_version ?? 1}</Badge>
        {saveNote && <Badge variant="outline">{saveNote}</Badge>}
      </div>

      <Button size="sm" variant="outline" onClick={addPhase} disabled={!state}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add phase
      </Button>

      <div className="space-y-3">
        {(state?.phases || []).map((phase, phaseIndex) => (
          <Card key={`${phase.name}-${phaseIndex}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between gap-2 text-sm">
                <Input
                  value={phase.name}
                  onChange={(event) =>
                    setState((current) => {
                      if (!current) {
                        return current
                      }
                      const phases = clonePhases(current.phases)
                      phases[phaseIndex].name = event.target.value
                      return { ...current, phases }
                    })
                  }
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={() => addItem(phaseIndex)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {phase.items.map((item, itemIndex) => (
                <div
                  key={`${item.name}-${itemIndex}`}
                  className="rounded-sm border border-border/80 p-2"
                >
                  <label className="mb-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(event) =>
                        updateItem(phaseIndex, itemIndex, (current) => ({
                          ...current,
                          done: event.target.checked,
                        }))
                      }
                    />
                    <Input
                      value={item.name}
                      onChange={(event) =>
                        updateItem(phaseIndex, itemIndex, (current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </label>
                  <Input
                    value={item.notes || ''}
                    onChange={(event) =>
                      updateItem(phaseIndex, itemIndex, (current) => ({
                        ...current,
                        notes: event.target.value || undefined,
                      }))
                    }
                    placeholder="Optional notes"
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
