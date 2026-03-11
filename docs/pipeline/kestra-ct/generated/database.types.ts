// CT-side staging artifact for Task 6.
// Source of truth: live Supabase `kt` schema as observed on 2026-03-09.
// Scope: row typing for preparation work only.
// Note: `Insert` and `Update` are intentionally permissive until repo migration
// parity is restored and these types are promoted into runtime paths.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type KtLogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE"

export type KtStateType =
  | "CREATED"
  | "RUNNING"
  | "PAUSED"
  | "RESTARTED"
  | "KILLING"
  | "SUCCESS"
  | "WARNING"
  | "FAILED"
  | "KILLED"
  | "CANCELLED"
  | "QUEUED"
  | "RETRYING"
  | "RETRIED"
  | "SKIPPED"
  | "BREAKPOINT"
  | "SUBMITTED"
  | "RESUBMITTED"

export type KtQueueType =
  | "io.kestra.core.models.executions.Execution"
  | "io.kestra.core.models.flows.FlowInterface"
  | "io.kestra.core.models.templates.Template"
  | "io.kestra.core.models.executions.ExecutionKilled"
  | "io.kestra.core.runners.WorkerJob"
  | "io.kestra.core.runners.WorkerTaskResult"
  | "io.kestra.core.runners.WorkerInstance"
  | "io.kestra.core.runners.WorkerTaskRunning"
  | "io.kestra.core.models.executions.LogEntry"
  | "io.kestra.core.models.triggers.Trigger"
  | "io.kestra.core.models.executions.MetricEntry"
  | "io.kestra.core.runners.WorkerTriggerResult"
  | "io.kestra.core.runners.SubflowExecutionResult"
  | "io.kestra.core.server.ClusterEvent"
  | "io.kestra.core.runners.SubflowExecutionEnd"
  | "io.kestra.core.runners.MultipleConditionEvent"
  | "io.kestra.ee.assets.AssetLineageEvent"
  | "io.kestra.ee.assets.AssetUpsertCommand"
  | "io.kestra.ee.assets.AssetStateEvent"

type EmptySchema = { [key: string]: never }

type TableDefinition<Row extends Record<string, unknown>> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  kt: {
    Tables: {
      concurrency_limit: TableDefinition<{
        key: string
        value: Json
        tenant_id: string | null
        namespace: string
        flow_id: string
        running: number
      }>
      dashboards: TableDefinition<{
        key: string
        value: Json
        tenant_id: string | null
        deleted: boolean
        id: string
        title: string
        description: string | null
        fulltext: string | null
        source_code: string
        created: string
        updated: string
      }>
      execution_queued: TableDefinition<{
        key: string
        value: Json
        tenant_id: string | null
        namespace: string
        flow_id: string
        date: string
      }>
      executions: TableDefinition<{
        key: string
        value: Json
        deleted: boolean
        namespace: string
        flow_id: string
        state_current: KtStateType
        state_duration: number | null
        start_date: string
        end_date: string | null
        fulltext: string | null
        id: string
        tenant_id: string | null
        trigger_execution_id: string | null
        kind: string | null
      }>
      executordelayed: TableDefinition<{
        key: string
        value: Json
        date: string
      }>
      executorstate: TableDefinition<{
        key: string
        value: Json
      }>
      flow_topologies: TableDefinition<{
        key: string
        value: Json
        source_namespace: string
        source_id: string
        relation: string
        destination_namespace: string
        destination_id: string
        source_tenant_id: string | null
        destination_tenant_id: string | null
      }>
      flows: TableDefinition<{
        key: string
        value: Json
        deleted: boolean
        id: string
        namespace: string
        revision: number
        fulltext: string | null
        source_code: string
        tenant_id: string | null
        updated: string | null
      }>
      flyway_schema_history: TableDefinition<{
        installed_rank: number
        version: string | null
        description: string
        type: string
        script: string
        checksum: number | null
        installed_by: string
        installed_on: string
        execution_time: number
        success: boolean
      }>
      kv_metadata: TableDefinition<{
        key: string
        value: Json
        tenant_id: string
        namespace: string
        name: string
        description: string | null
        version: number
        last: boolean
        expiration_date: string | null
        updated: string
        deleted: boolean
        fulltext: string | null
        created: string
      }>
      logs: TableDefinition<{
        key: string
        value: Json
        namespace: string
        flow_id: string
        task_id: string | null
        execution_id: string | null
        taskrun_id: string | null
        attempt_number: number | null
        trigger_id: string | null
        level: KtLogLevel
        timestamp: string
        tenant_id: string | null
        fulltext: string | null
        execution_kind: string | null
      }>
      metrics: TableDefinition<{
        key: string
        value: Json
        namespace: string
        flow_id: string
        task_id: string
        execution_id: string
        taskrun_id: string
        metric_name: string
        timestamp: string
        metric_value: number
        tenant_id: string | null
        execution_kind: string | null
      }>
      multipleconditions: TableDefinition<{
        key: string
        value: Json
        namespace: string
        flow_id: string
        condition_id: string
        start_date: string
        end_date: string
        tenant_id: string | null
      }>
      namespace_file_metadata: TableDefinition<{
        key: string
        value: Json
        tenant_id: string | null
        namespace: string
        path: string
        parent_path: string | null
        version: number
        last: boolean
        size: number
        created: string
        updated: string
        deleted: boolean
        fulltext: string | null
      }>
      queues: TableDefinition<{
        offset: number
        type: KtQueueType
        key: string
        value: Json
        updated: string | null
        consumer_indexer: boolean | null
        consumer_executor: boolean | null
        consumer_worker: boolean | null
        consumer_scheduler: boolean | null
        consumer_flow_topology: boolean | null
        consumer_group: string | null
      }>
      service_instance: TableDefinition<{
        key: string
        value: Json
        service_id: string
        service_type: string
        state: string
        created_at: string
        updated_at: string
      }>
      settings: TableDefinition<{
        key: string
        value: Json
      }>
      sla_monitor: TableDefinition<{
        key: string
        value: Json
        execution_id: string
        sla_id: string
        deadline: string
      }>
      templates: TableDefinition<{
        key: string
        value: Json
        deleted: boolean
        id: string
        namespace: string
        fulltext: string | null
        tenant_id: string | null
      }>
      triggers: TableDefinition<{
        key: string
        value: Json
        namespace: string
        flow_id: string
        trigger_id: string
        execution_id: string | null
        fulltext: string | null
        tenant_id: string | null
        next_execution_date: string | null
        worker_id: string | null
        disabled: boolean
      }>
      worker_job_running: TableDefinition<{
        key: string
        value: Json
        worker_uuid: string
      }>
    }
    Views: EmptySchema
    Functions: EmptySchema
    Enums: {
      log_level: KtLogLevel
      queue_type: KtQueueType
      state_type: KtStateType
    }
    CompositeTypes: EmptySchema
  }
}

export type KtTables = Database["kt"]["Tables"]
export type KtTableName = keyof KtTables
export type KtRow<T extends KtTableName> = KtTables[T]["Row"]
export type KtInsert<T extends KtTableName> = KtTables[T]["Insert"]
export type KtUpdate<T extends KtTableName> = KtTables[T]["Update"]
