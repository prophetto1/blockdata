// Synthesized from the live Supabase kt schema via schema introspection.
// This file is intentionally scoped to the Kestra compatibility layer.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type KtLogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';

export type KtStateType =
  | 'CREATED'
  | 'RUNNING'
  | 'PAUSED'
  | 'RESTARTED'
  | 'KILLING'
  | 'SUCCESS'
  | 'WARNING'
  | 'FAILED'
  | 'KILLED'
  | 'CANCELLED'
  | 'QUEUED'
  | 'RETRYING'
  | 'RETRIED'
  | 'SKIPPED'
  | 'BREAKPOINT'
  | 'SUBMITTED'
  | 'RESUBMITTED';

export type KtQueueType =
  | 'io.kestra.core.models.executions.Execution'
  | 'io.kestra.core.models.flows.FlowInterface'
  | 'io.kestra.core.models.templates.Template'
  | 'io.kestra.core.models.executions.ExecutionKilled'
  | 'io.kestra.core.runners.WorkerJob'
  | 'io.kestra.core.runners.WorkerTaskResult'
  | 'io.kestra.core.runners.WorkerInstance'
  | 'io.kestra.core.runners.WorkerTaskRunning'
  | 'io.kestra.core.models.executions.LogEntry'
  | 'io.kestra.core.models.triggers.Trigger'
  | 'io.kestra.core.models.executions.MetricEntry'
  | 'io.kestra.core.runners.WorkerTriggerResult'
  | 'io.kestra.core.runners.SubflowExecutionResult'
  | 'io.kestra.core.server.ClusterEvent'
  | 'io.kestra.core.runners.SubflowExecutionEnd'
  | 'io.kestra.core.runners.MultipleConditionEvent'
  | 'io.kestra.ee.assets.AssetLineageEvent'
  | 'io.kestra.ee.assets.AssetUpsertCommand'
  | 'io.kestra.ee.assets.AssetStateEvent';

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  kt: {
    Tables: {
      concurrency_limit: {
        Row: {
          key: string;
          value: Json;
          tenant_id: string | null;
          namespace: string;
          flow_id: string;
          running: number;
        };
        Insert: {
          key: string;
          value: Json;
          tenant_id?: never;
          namespace?: never;
          flow_id?: never;
          running?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          tenant_id?: never;
          namespace?: never;
          flow_id?: never;
          running?: never;
        };
        Relationships: [];
      };
      dashboards: {
        Row: {
          key: string;
          value: Json;
          tenant_id: string | null;
          deleted: boolean;
          id: string;
          title: string;
          description: string | null;
          fulltext: string | null;
          source_code: string;
          created: string;
          updated: string;
        };
        Insert: {
          key: string;
          value: Json;
          source_code: string;
          created?: string;
          updated?: string;
          tenant_id?: never;
          deleted?: never;
          id?: never;
          title?: never;
          description?: never;
          fulltext?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          source_code?: string;
          created?: string;
          updated?: string;
          tenant_id?: never;
          deleted?: never;
          id?: never;
          title?: never;
          description?: never;
          fulltext?: never;
        };
        Relationships: [];
      };
      execution_queued: {
        Row: {
          key: string;
          value: Json;
          tenant_id: string | null;
          namespace: string;
          flow_id: string;
          date: string;
        };
        Insert: {
          key: string;
          value: Json;
          tenant_id?: never;
          namespace?: never;
          flow_id?: never;
          date?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          tenant_id?: never;
          namespace?: never;
          flow_id?: never;
          date?: never;
        };
        Relationships: [];
      };
      executions: {
        Row: {
          key: string;
          value: Json;
          deleted: boolean;
          namespace: string;
          flow_id: string;
          state_current: KtStateType;
          state_duration: number | null;
          start_date: string;
          end_date: string | null;
          fulltext: string | null;
          id: string;
          tenant_id: string | null;
          trigger_execution_id: string | null;
          kind: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          deleted?: never;
          namespace?: never;
          flow_id?: never;
          state_current?: never;
          state_duration?: never;
          start_date?: never;
          end_date?: never;
          fulltext?: never;
          id?: never;
          tenant_id?: never;
          trigger_execution_id?: never;
          kind?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          deleted?: never;
          namespace?: never;
          flow_id?: never;
          state_current?: never;
          state_duration?: never;
          start_date?: never;
          end_date?: never;
          fulltext?: never;
          id?: never;
          tenant_id?: never;
          trigger_execution_id?: never;
          kind?: never;
        };
        Relationships: [];
      };
      executordelayed: {
        Row: {
          key: string;
          value: Json;
          date: string;
        };
        Insert: {
          key: string;
          value: Json;
          date?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          date?: never;
        };
        Relationships: [];
      };
      executorstate: {
        Row: {
          key: string;
          value: Json;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: {
          key?: string;
          value?: Json;
        };
        Relationships: [];
      };
      flow_topologies: {
        Row: {
          key: string;
          value: Json;
          source_namespace: string;
          source_id: string;
          relation: string;
          destination_namespace: string;
          destination_id: string;
          source_tenant_id: string | null;
          destination_tenant_id: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          source_namespace?: never;
          source_id?: never;
          relation?: never;
          destination_namespace?: never;
          destination_id?: never;
          source_tenant_id?: never;
          destination_tenant_id?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          source_namespace?: never;
          source_id?: never;
          relation?: never;
          destination_namespace?: never;
          destination_id?: never;
          source_tenant_id?: never;
          destination_tenant_id?: never;
        };
        Relationships: [];
      };
      flows: {
        Row: {
          key: string;
          value: Json;
          deleted: boolean;
          id: string;
          namespace: string;
          revision: number;
          fulltext: string | null;
          source_code: string;
          tenant_id: string | null;
          updated: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          source_code: string;
          deleted?: never;
          id?: never;
          namespace?: never;
          revision?: never;
          fulltext?: never;
          tenant_id?: never;
          updated?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          source_code?: string;
          deleted?: never;
          id?: never;
          namespace?: never;
          revision?: never;
          fulltext?: never;
          tenant_id?: never;
          updated?: never;
        };
        Relationships: [];
      };
      flyway_schema_history: {
        Row: {
          installed_rank: number;
          version: string | null;
          description: string;
          type: string;
          script: string;
          checksum: number | null;
          installed_by: string;
          installed_on: string;
          execution_time: number;
          success: boolean;
        };
        Insert: {
          installed_rank: number;
          description: string;
          type: string;
          script: string;
          installed_by: string;
          execution_time: number;
          success: boolean;
          version?: string | null;
          checksum?: number | null;
          installed_on?: string;
        };
        Update: {
          installed_rank?: number;
          version?: string | null;
          description?: string;
          type?: string;
          script?: string;
          checksum?: number | null;
          installed_by?: string;
          installed_on?: string;
          execution_time?: number;
          success?: boolean;
        };
        Relationships: [];
      };
      kv_metadata: {
        Row: {
          key: string;
          value: Json;
          tenant_id: string;
          namespace: string;
          name: string;
          description: string | null;
          version: number;
          last: boolean;
          expiration_date: string | null;
          updated: string;
          deleted: boolean;
          fulltext: string | null;
          created: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated?: string;
          tenant_id?: never;
          namespace?: never;
          name?: never;
          description?: never;
          version?: never;
          last?: never;
          expiration_date?: never;
          deleted?: never;
          fulltext?: never;
          created?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          updated?: string;
          tenant_id?: never;
          namespace?: never;
          name?: never;
          description?: never;
          version?: never;
          last?: never;
          expiration_date?: never;
          deleted?: never;
          fulltext?: never;
          created?: never;
        };
        Relationships: [];
      };
      logs: {
        Row: {
          key: string;
          value: Json;
          namespace: string;
          flow_id: string;
          task_id: string | null;
          execution_id: string | null;
          taskrun_id: string | null;
          attempt_number: number | null;
          trigger_id: string | null;
          level: KtLogLevel;
          timestamp: string;
          tenant_id: string | null;
          fulltext: string | null;
          execution_kind: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          namespace?: never;
          flow_id?: never;
          task_id?: never;
          execution_id?: never;
          taskrun_id?: never;
          attempt_number?: never;
          trigger_id?: never;
          level?: never;
          timestamp?: never;
          tenant_id?: never;
          fulltext?: never;
          execution_kind?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          namespace?: never;
          flow_id?: never;
          task_id?: never;
          execution_id?: never;
          taskrun_id?: never;
          attempt_number?: never;
          trigger_id?: never;
          level?: never;
          timestamp?: never;
          tenant_id?: never;
          fulltext?: never;
          execution_kind?: never;
        };
        Relationships: [];
      };
      metrics: {
        Row: {
          key: string;
          value: Json;
          namespace: string;
          flow_id: string;
          task_id: string;
          execution_id: string;
          taskrun_id: string;
          metric_name: string;
          timestamp: string;
          metric_value: number;
          tenant_id: string | null;
          execution_kind: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          namespace?: never;
          flow_id?: never;
          task_id?: never;
          execution_id?: never;
          taskrun_id?: never;
          metric_name?: never;
          timestamp?: never;
          metric_value?: never;
          tenant_id?: never;
          execution_kind?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          namespace?: never;
          flow_id?: never;
          task_id?: never;
          execution_id?: never;
          taskrun_id?: never;
          metric_name?: never;
          timestamp?: never;
          metric_value?: never;
          tenant_id?: never;
          execution_kind?: never;
        };
        Relationships: [];
      };
      multipleconditions: {
        Row: {
          key: string;
          value: Json;
          namespace: string;
          flow_id: string;
          condition_id: string;
          start_date: string;
          end_date: string;
          tenant_id: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          namespace?: never;
          flow_id?: never;
          condition_id?: never;
          start_date?: never;
          end_date?: never;
          tenant_id?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          namespace?: never;
          flow_id?: never;
          condition_id?: never;
          start_date?: never;
          end_date?: never;
          tenant_id?: never;
        };
        Relationships: [];
      };
      namespace_file_metadata: {
        Row: {
          key: string;
          value: Json;
          tenant_id: string | null;
          namespace: string;
          path: string;
          parent_path: string | null;
          version: number;
          last: boolean;
          size: number;
          created: string;
          updated: string;
          deleted: boolean;
          fulltext: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          tenant_id?: never;
          namespace?: never;
          path?: never;
          parent_path?: never;
          version?: never;
          last?: never;
          size?: never;
          created?: never;
          updated?: never;
          deleted?: never;
          fulltext?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          tenant_id?: never;
          namespace?: never;
          path?: never;
          parent_path?: never;
          version?: never;
          last?: never;
          size?: never;
          created?: never;
          updated?: never;
          deleted?: never;
          fulltext?: never;
        };
        Relationships: [];
      };
      queues: {
        Row: {
          offset: number;
          type: KtQueueType;
          key: string;
          value: Json;
          updated: string | null;
          consumer_indexer: boolean | null;
          consumer_executor: boolean | null;
          consumer_worker: boolean | null;
          consumer_scheduler: boolean | null;
          consumer_flow_topology: boolean | null;
          consumer_group: string | null;
        };
        Insert: {
          type: KtQueueType;
          key: string;
          value: Json;
          offset?: number;
          updated?: string | null;
          consumer_indexer?: boolean | null;
          consumer_executor?: boolean | null;
          consumer_worker?: boolean | null;
          consumer_scheduler?: boolean | null;
          consumer_flow_topology?: boolean | null;
          consumer_group?: string | null;
        };
        Update: {
          offset?: number;
          type?: KtQueueType;
          key?: string;
          value?: Json;
          updated?: string | null;
          consumer_indexer?: boolean | null;
          consumer_executor?: boolean | null;
          consumer_worker?: boolean | null;
          consumer_scheduler?: boolean | null;
          consumer_flow_topology?: boolean | null;
          consumer_group?: string | null;
        };
        Relationships: [];
      };
      service_instance: {
        Row: {
          key: string;
          value: Json;
          service_id: string;
          service_type: string;
          state: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          service_id?: never;
          service_type?: never;
          state?: never;
          created_at?: never;
          updated_at?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          service_id?: never;
          service_type?: never;
          state?: never;
          created_at?: never;
          updated_at?: never;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          key: string;
          value: Json;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: {
          key?: string;
          value?: Json;
        };
        Relationships: [];
      };
      sla_monitor: {
        Row: {
          key: string;
          value: Json;
          execution_id: string;
          sla_id: string;
          deadline: string;
        };
        Insert: {
          key: string;
          value: Json;
          execution_id?: never;
          sla_id?: never;
          deadline?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          execution_id?: never;
          sla_id?: never;
          deadline?: never;
        };
        Relationships: [];
      };
      templates: {
        Row: {
          key: string;
          value: Json;
          deleted: boolean;
          id: string;
          namespace: string;
          fulltext: string | null;
          tenant_id: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          deleted?: never;
          id?: never;
          namespace?: never;
          fulltext?: never;
          tenant_id?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          deleted?: never;
          id?: never;
          namespace?: never;
          fulltext?: never;
          tenant_id?: never;
        };
        Relationships: [];
      };
      triggers: {
        Row: {
          key: string;
          value: Json;
          namespace: string;
          flow_id: string;
          trigger_id: string;
          execution_id: string | null;
          fulltext: string | null;
          tenant_id: string | null;
          next_execution_date: string | null;
          worker_id: string | null;
          disabled: boolean;
        };
        Insert: {
          key: string;
          value: Json;
          namespace?: never;
          flow_id?: never;
          trigger_id?: never;
          execution_id?: never;
          fulltext?: never;
          tenant_id?: never;
          next_execution_date?: never;
          worker_id?: never;
          disabled?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          namespace?: never;
          flow_id?: never;
          trigger_id?: never;
          execution_id?: never;
          fulltext?: never;
          tenant_id?: never;
          next_execution_date?: never;
          worker_id?: never;
          disabled?: never;
        };
        Relationships: [];
      };
      worker_job_running: {
        Row: {
          key: string;
          value: Json;
          worker_uuid: string;
        };
        Insert: {
          key: string;
          value: Json;
          worker_uuid?: never;
        };
        Update: {
          key?: string;
          value?: Json;
          worker_uuid?: never;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      log_level: KtLogLevel;
      queue_type: KtQueueType;
      state_type: KtStateType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type KtSchema = Database['kt'];

export type KtTables<TableName extends keyof KtSchema['Tables']> =
  KtSchema['Tables'][TableName]['Row'];

export type KtTablesInsert<TableName extends keyof KtSchema['Tables']> =
  KtSchema['Tables'][TableName]['Insert'];

export type KtTablesUpdate<TableName extends keyof KtSchema['Tables']> =
  KtSchema['Tables'][TableName]['Update'];

export type KtEnums<EnumName extends keyof KtSchema['Enums']> =
  KtSchema['Enums'][EnumName];

