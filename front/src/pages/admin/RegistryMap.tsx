import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, RefreshCw, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  fetchDispatch,
  type DispatchResponse,
  getSpineDashboardApiBase,
} from '@/lib/spineDashboardApi'

const ALL = '__ALL__'

type RuleRow = {
  key: string
  block_type: string
  languageSet: string[]
  pipelineSet: string[]
  languageLabel: string
  pipelineLabel: string
  resolved_class: string
  combination_count: number
  sampleCases: string[]
}

function classBadgeStyle(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  const hue = Math.abs(hash % 360)
  return {
    borderColor: `hsl(${hue} 42% 56%)`,
    backgroundColor: `hsl(${hue} 64% 93%)`,
    color: `hsl(${hue} 52% 20%)`,
  }
}

function normalizeSet(values: Iterable<string>) {
  return [...new Set(values)].sort()
}

function setLabel(selected: string[], universe: string[]) {
  if (selected.length === 0) {
    return 'none'
  }
  if (selected.length === universe.length) {
    return 'any'
  }
  if (selected.length === 1) {
    return selected[0]
  }
  if (selected.length > universe.length / 2) {
    const excluded = universe.filter((value) => !selected.includes(value))
    if (excluded.length === 1) {
      return `any except ${excluded[0]}`
    }
    return `any except ${excluded.join(', ')}`
  }
  return selected.join(', ')
}

function buildRuleRows(data: DispatchResponse): RuleRow[] {
  const byLanguage = new Map<
    string,
    {
      block_type: string
      resolved_class: string
      language: string
      pipelineSet: Set<string>
      combination_count: number
    }
  >()

  for (const row of data.block_dispatch) {
    const key = [row.block_type, row.resolved_class, row.language].join('|')
    const current = byLanguage.get(key) ?? {
      block_type: row.block_type,
      resolved_class: row.resolved_class,
      language: row.language,
      pipelineSet: new Set<string>(),
      combination_count: 0,
    }
    current.pipelineSet.add(row.pipeline_type)
    current.combination_count += 1
    byLanguage.set(key, current)
  }

  const groupedRules = new Map<
    string,
    {
      block_type: string
      resolved_class: string
      languageSet: Set<string>
      pipelineSet: Set<string>
      combination_count: number
      sampleCases: Set<string>
    }
  >()

  for (const value of byLanguage.values()) {
    const pipelineKey = normalizeSet(value.pipelineSet).join(',')
    const key = [value.block_type, value.resolved_class, pipelineKey].join('|')
    const current = groupedRules.get(key) ?? {
      block_type: value.block_type,
      resolved_class: value.resolved_class,
      languageSet: new Set<string>(),
      pipelineSet: new Set<string>(value.pipelineSet),
      combination_count: 0,
      sampleCases: new Set<string>(),
    }
    current.languageSet.add(value.language)
    current.combination_count += value.combination_count
    const samplePipeline = normalizeSet(value.pipelineSet)[0]
    if (samplePipeline) {
      current.sampleCases.add(`${value.language} + ${samplePipeline}`)
    }
    groupedRules.set(key, current)
  }

  const languages = normalizeSet(data.meta.languages)
  const pipelineTypes = normalizeSet(data.meta.pipeline_types)

  return [...groupedRules.values()]
    .map((entry) => {
      const languageSet = normalizeSet(entry.languageSet)
      const pipelineSet = normalizeSet(entry.pipelineSet)
      return {
        key: [
          entry.block_type,
          entry.resolved_class,
          languageSet.join(','),
          pipelineSet.join(','),
        ].join('|'),
        block_type: entry.block_type,
        languageSet,
        pipelineSet,
        languageLabel: setLabel(languageSet, languages),
        pipelineLabel: setLabel(pipelineSet, pipelineTypes),
        resolved_class: entry.resolved_class,
        combination_count: entry.combination_count,
        sampleCases: normalizeSet(entry.sampleCases).slice(0, 3),
      }
    })
    .sort((a, b) => {
      if (a.block_type !== b.block_type) {
        return a.block_type.localeCompare(b.block_type)
      }
      if (a.resolved_class !== b.resolved_class) {
        return a.resolved_class.localeCompare(b.resolved_class)
      }
      if (a.languageLabel !== b.languageLabel) {
        return a.languageLabel.localeCompare(b.languageLabel)
      }
      return a.pipelineLabel.localeCompare(b.pipelineLabel)
    })
}

export default function AdminRegistryMapPage() {
  const [data, setData] = useState<DispatchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [blockType, setBlockType] = useState(ALL)
  const [language, setLanguage] = useState(ALL)
  const [pipelineType, setPipelineType] = useState(ALL)
  const [previewBlockType, setPreviewBlockType] = useState('')
  const [previewLanguage, setPreviewLanguage] = useState('')
  const [previewPipelineType, setPreviewPipelineType] = useState('')

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetchDispatch()
      setData(response)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dispatch entries.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!data) {
      return
    }
    const nextBlockType = data.meta.block_types.includes(previewBlockType)
      ? previewBlockType
      : (data.meta.block_types[0] ?? '')
    const nextLanguage = data.meta.languages.includes(previewLanguage)
      ? previewLanguage
      : (data.meta.languages[0] ?? '')
    const nextPipelineType = data.meta.pipeline_types.includes(previewPipelineType)
      ? previewPipelineType
      : (data.meta.pipeline_types[0] ?? '')

    if (nextBlockType !== previewBlockType) {
      setPreviewBlockType(nextBlockType)
    }
    if (nextLanguage !== previewLanguage) {
      setPreviewLanguage(nextLanguage)
    }
    if (nextPipelineType !== previewPipelineType) {
      setPreviewPipelineType(nextPipelineType)
    }
  }, [data, previewBlockType, previewLanguage, previewPipelineType])

  const ruleRows = useMemo(() => {
    if (!data) {
      return [] as RuleRow[]
    }
    return buildRuleRows(data)
  }, [data])

  const filteredRows = useMemo(() => {
    if (!data) {
      return [] as RuleRow[]
    }
    const q = query.trim().toLowerCase()
    return ruleRows.filter((row) => {
      if (blockType !== ALL && row.block_type !== blockType) {
        return false
      }
      if (language !== ALL && !row.languageSet.includes(language)) {
        return false
      }
      if (pipelineType !== ALL && !row.pipelineSet.includes(pipelineType)) {
        return false
      }
      if (!q) {
        return true
      }
      return `${row.block_type} ${row.languageLabel} ${row.pipelineLabel} ${row.resolved_class}`
        .toLowerCase()
        .includes(q)
    })
  }, [blockType, data, language, pipelineType, query, ruleRows])

  const previewResult = useMemo(() => {
    if (!data || !previewBlockType || !previewLanguage || !previewPipelineType) {
      return null
    }
    const exact = data.block_dispatch.find(
      (entry) =>
        entry.block_type === previewBlockType &&
        entry.language === previewLanguage &&
        entry.pipeline_type === previewPipelineType,
    )
    if (!exact) {
      return null
    }
    const matchedRule = ruleRows.find(
      (row) =>
        row.block_type === previewBlockType &&
        row.resolved_class === exact.resolved_class &&
        row.languageSet.includes(previewLanguage) &&
        row.pipelineSet.includes(previewPipelineType),
    )
    return { exact, matchedRule }
  }, [data, previewBlockType, previewLanguage, previewPipelineType, ruleRows])

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Registry map</h1>
          <p className="text-sm text-muted-foreground">
            Dispatch baseline explorer for block and executor resolution.
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
              <p className="font-medium">Registry API unavailable</p>
              <p className="text-xs">Base URL: {getSpineDashboardApiBase()}</p>
              <p className="text-xs">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{ruleRows.length} decision rules</Badge>
          <Badge variant="secondary">{data.meta.total_entries} raw combinations</Badge>
          <Badge variant="secondary">{data.meta.block_types.length} block types</Badge>
          <Badge variant="secondary">{data.meta.resolved_classes.length} classes</Badge>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">How to read this page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs text-muted-foreground">
          <p>1. Each row is a decision rule that can match many raw combinations.</p>
          <p>
            2. <span className="font-medium text-foreground">Language condition</span> and{' '}
            <span className="font-medium text-foreground">Pipeline condition</span> tell you when
            the rule applies.
          </p>
          <p>
            3. <span className="font-medium text-foreground">Coverage</span> is how many raw
            combinations were collapsed into that rule.
          </p>
          <p>
            4. Use <span className="font-medium text-foreground">Resolver preview</span> for an
            exact block/language/pipeline lookup.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Resolver preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Block type</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={previewBlockType}
                onChange={(event) => setPreviewBlockType(event.target.value)}
              >
                {(data?.meta.block_types || []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Language</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={previewLanguage}
                onChange={(event) => setPreviewLanguage(event.target.value)}
              >
                {(data?.meta.languages || []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Pipeline type</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={previewPipelineType}
                onChange={(event) => setPreviewPipelineType(event.target.value)}
              >
                {(data?.meta.pipeline_types || []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {previewResult ? (
            <div className="grid grid-cols-1 gap-2 rounded-md border border-border/70 bg-muted/20 p-2 md:grid-cols-[1.3fr_1fr]">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Resolved class</p>
                <Badge
                  variant="outline"
                  style={classBadgeStyle(previewResult.exact.resolved_class)}
                  className="max-w-full truncate px-1.5 py-0 text-[10px] font-mono"
                  title={previewResult.exact.resolved_class}
                >
                  {previewResult.exact.resolved_class}
                </Badge>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <p>
                  Matched rule:{' '}
                  <span className="font-mono text-foreground">
                    {previewResult.matchedRule
                      ? `${previewResult.matchedRule.languageLabel} / ${previewResult.matchedRule.pipelineLabel}`
                      : 'not found'}
                  </span>
                </p>
                {previewResult.matchedRule && (
                  <p>
                    Rule coverage:{' '}
                    <span className="font-mono text-foreground">
                      {previewResult.matchedRule.combination_count}
                    </span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No dispatch row found for the selected combination.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Block type</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={blockType}
              onChange={(event) => setBlockType(event.target.value)}
            >
              <option value={ALL}>All block types</option>
              {(data?.meta.block_types || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Language</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value={ALL}>All languages</option>
              {(data?.meta.languages || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Pipeline type</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={pipelineType}
              onChange={(event) => setPipelineType(event.target.value)}
            >
              <option value={ALL}>All pipeline types</option>
              {(data?.meta.pipeline_types || []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search dispatch rows"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Block dispatch {data ? `(${filteredRows.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="table-fixed text-xs">
            <TableHeader>
              <TableRow className="h-8">
                <TableHead className="h-8 px-2 py-1 text-[11px]">BlockType</TableHead>
                <TableHead className="h-8 px-2 py-1 text-[11px]">Language condition</TableHead>
                <TableHead className="h-8 px-2 py-1 text-[11px]">Pipeline condition</TableHead>
                <TableHead className="h-8 px-2 py-1 text-[11px]">Resolved class</TableHead>
                <TableHead className="h-8 px-2 py-1 text-[11px]">Examples</TableHead>
                <TableHead className="h-8 px-2 py-1 text-right text-[11px]">Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.key} className="h-8">
                  <TableCell className="px-2 py-1 font-mono text-[11px]">{row.block_type}</TableCell>
                  <TableCell
                    className="px-2 py-1 font-mono text-[11px]"
                    title={row.languageSet.join(', ')}
                  >
                    <span className="block max-w-[260px] truncate">{row.languageLabel}</span>
                  </TableCell>
                  <TableCell
                    className="px-2 py-1 font-mono text-[11px]"
                    title={row.pipelineSet.join(', ')}
                  >
                    <span className="block max-w-[260px] truncate">{row.pipelineLabel}</span>
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <Badge
                      variant="outline"
                      style={classBadgeStyle(row.resolved_class)}
                      className="max-w-[360px] truncate px-1.5 py-0 text-[10px] font-mono"
                      title={row.resolved_class}
                    >
                      {row.resolved_class}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="px-2 py-1 font-mono text-[11px]"
                    title={row.sampleCases.join('; ')}
                  >
                    <span className="block max-w-[300px] truncate">
                      {row.sampleCases.length > 0 ? row.sampleCases.join('; ') : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right font-mono text-[11px]">
                    {row.combination_count}
                  </TableCell>
                </TableRow>
              ))}

              {!loading && filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                    No rows match the selected filters.
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
