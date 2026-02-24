export type DispatchRow = {
  key: string
  block_type: string
  language: string
  pipeline_type: string
  resolved_class: string
}

export type DispatchResponse = {
  block_dispatch: DispatchRow[]
  executor_dispatch: {
    pipeline: Record<string, string>
    block: Record<string, string>
  }
  meta: {
    total_entries: number
    block_types: string[]
    languages: string[]
    pipeline_types: string[]
    resolved_classes: string[]
    executor_pipeline_cases: number
    executor_block_cases: number
  }
}

export type GateLastRun = {
  ran_at: string
  passed: boolean
  return_code: number
  duration_ms: number
}

export type Gate = {
  name: string
  label: string
  script_path: string
  exists: boolean
  runnable: boolean
  last_run?: GateLastRun
}

export type GatesResponse = {
  gates: Gate[]
}

export type GateRunResponse = {
  gate_name: string
  passed: boolean
  return_code: number
  duration_ms: number
  output: string
}

export type ProtectedFile = {
  path: string
  exists: boolean
  size_bytes: number | null
}

export type ProtectedFilesResponse = {
  files: ProtectedFile[]
}

export type ProgressItem = {
  name: string
  done: boolean
  notes?: string
}

export type ProgressPhase = {
  name: string
  items: ProgressItem[]
}

export type ProgressResponse = {
  schema_version: number
  last_gate_runs: Record<string, GateLastRun>
  phases: ProgressPhase[]
  updated_at?: string
}

const configuredApiBase = (import.meta.env.VITE_SPINE_DASHBOARD_API_BASE as string | undefined)?.replace(
  /\/+$/,
  '',
)
const apiBase = configuredApiBase || '/spine-api'

function buildUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path
  }
  return `${apiBase}${path}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), init)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Request failed (${response.status}): ${text || response.statusText}`)
  }
  return (await response.json()) as T
}

export function getSpineDashboardApiBase() {
  return apiBase
}

export function fetchDispatch() {
  return requestJson<DispatchResponse>('/api/dispatch')
}

export function fetchGates() {
  return requestJson<GatesResponse>('/api/gates')
}

export function runGate(gateName: string) {
  return requestJson<GateRunResponse>('/api/gates/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ gate_name: gateName }),
  })
}

export function fetchProtectedFiles() {
  return requestJson<ProtectedFilesResponse>('/api/protected-files')
}

export function fetchProgress() {
  return requestJson<ProgressResponse>('/api/progress')
}

export function saveProgress(phases: ProgressPhase[]) {
  return requestJson<ProgressResponse>('/api/progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phases }),
  })
}
